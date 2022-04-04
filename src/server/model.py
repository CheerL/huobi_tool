import os
import re
import configparser
import time as _time
from sqlalchemy import Column, create_engine, VARCHAR, INTEGER, REAL, TEXT, func, Table
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import redis

ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(ROOT, 'config.ini')

config = configparser.ConfigParser()
config.read(CONFIG_PATH)

PGHOST = config.get('data', 'PGHost')
PGPORT = config.getint('data', 'PGPort')
PGUSER = config.get('data', 'PGUser')
PGPASSWORD = config.get('data', 'PGPassword')
PGNAME = config.get('data', 'PGDatabase')
RHOST = config.get('data', 'RHost')
RPORT = config.getint('data', 'RPort')
RPASSWORD = config.get('data', 'RPassword')

PGNAMES = [PGNAME, 'loss']

Base = declarative_base()
TRADE_CLASS = {}
MS_IN_DAY = 60*60*24*1000


class Redis(redis.StrictRedis):
    pool = redis.ConnectionPool(host=RHOST, port=RPORT, db=0, password=RPASSWORD, max_connections=10)
 
    def __init__(self, host=RHOST, port=RPORT,
                db=0, password=RPASSWORD, socket_timeout=None,
                socket_connect_timeout=None,
                socket_keepalive=None, socket_keepalive_options=None,
                connection_pool=None, unix_socket_path=None,
                encoding='utf-8', encoding_errors='strict',
                charset=None, errors=None,
                decode_responses=False, retry_on_timeout=False,
                ssl=False, ssl_keyfile=None, ssl_certfile=None,
                ssl_cert_reqs='required', ssl_ca_certs=None,
                ssl_check_hostname=False,
                max_connections=None, single_connection_client=False,
                health_check_interval=30, client_name=None, username=None):
        super().__init__(host=host, port=port, db=db, password=password,
                        socket_timeout=socket_timeout, 
                        socket_connect_timeout=socket_connect_timeout,
                        socket_keepalive=socket_keepalive,
                        socket_keepalive_options=socket_keepalive_options,
                        connection_pool=connection_pool or self.pool, unix_socket_path=unix_socket_path,
                        encoding=encoding, encoding_errors=encoding_errors,
                        charset=charset, errors=errors, decode_responses=decode_responses,
                        retry_on_timeout=retry_on_timeout, ssl=ssl, ssl_keyfile=ssl_keyfile,
                        ssl_certfile=ssl_certfile, ssl_cert_reqs=ssl_cert_reqs,
                        ssl_ca_certs=ssl_ca_certs, ssl_check_hostname=ssl_check_hostname,
                        max_connections=max_connections, single_connection_client=single_connection_client,
                        health_check_interval=health_check_interval, client_name=client_name,
                        username=username)

    def scan_iter_with_data(self, match: str, count: int):
        cursor = '0'
        while cursor != 0:
            cursor, keys = self.scan(cursor, match, count)
            values = self.mget(keys)
            if keys and values:
                yield keys, values

    def get_binance_price(self):
        keys = self.keys(f'Binance_price_*')
        if keys:
            res = self.mget(keys)
            return {
                symbol.decode()[14:]: float(price.decode())
                for symbol, price in zip(keys, res)
            }
        else:
            return {}


class Profit(Base):
    __tablename__ = 'profit'
    id = Column(INTEGER, primary_key=True)
    account = Column(VARCHAR(20))
    month = Column(VARCHAR(20))
    time = Column(REAL)
    pay = Column(REAL)
    income = Column(REAL)
    profit = Column(REAL)
    percent = Column(REAL)

    @staticmethod
    def get_sum_profit(session, account, month=None):
        result = session.query(func.sum(Profit.profit)).filter(
            Profit.account == str(account))
        if month:
            result = result.filter(Profit.month == month)
        return result.scalar()

    @staticmethod
    def get_id(session, account, pay, income):
        return session.execute(f"SELECT id FROM profit WHERE account = '{account}' AND pay = '{pay}' AND income = '{income}'").scalar()


class Record(Base):
    __tablename__ = 'record'
    id = Column(INTEGER, primary_key=True)
    profit_id = Column(INTEGER)
    currency = Column(VARCHAR(10))
    tm = Column(VARCHAR(40))
    price = Column(REAL)
    amount = Column(REAL)
    vol = Column(REAL)
    fee = Column(REAL)
    direction = Column(VARCHAR(5))

    @staticmethod
    def from_record_info(infos, profit_id, direction):
        records = [Record(
            profit_id=profit_id,
            currency=record_info['currency'],
            tm=record_info['time'],
            price=record_info['price'],
            amount=record_info['amount'],
            vol=record_info['vol'],
            fee=record_info['fee'],
            direction=direction
        ) for record_info in infos]
        return records


class Message(Base):
    __tablename__ = 'message'
    id = Column(INTEGER, primary_key=True)
    summary = Column(VARCHAR(100))
    msg = Column(TEXT)
    msg_type = Column(INTEGER)
    uids = Column(VARCHAR(200))


def get_session(host=PGHOST, port=PGPORT, db=PGNAME, user=PGUSER, password=PGPASSWORD) -> Session:
    engine = create_engine(
        f'postgresql://{user}:{password}@{host}:{port}/{db}')
    Session = sessionmaker(bind=engine)
    Base.metadata.bind = engine
    Base.metadata.create_all()
    return Session()


def create_Trade(day):
    class Trade(Base):
        __tablename__ = f'trade_{day}' if day else 'trade'
        id = Column(INTEGER, primary_key=True)
        symbol = Column(VARCHAR(10))
        ts = Column(VARCHAR(20))
        price = Column(REAL)
        amount = Column(REAL)
        direction = Column(VARCHAR(5))

        @staticmethod
        def get_data(session, symbol, start, end):
            data = session.query(Trade).filter(
                Trade.symbol == symbol,
                Trade.ts >= str(start),
                Trade.ts <= str(end)
            ).order_by(Trade.ts)
            return data

        @staticmethod
        def from_trade(trade):
            return Trade(
                symbol=trade.symbol,
                ts=trade.ts,
                price=trade.price,
                amount=trade.amount,
                direction=trade.direction
            )

    Base.metadata.create_all()
    TRADE_CLASS[day] = Trade
    return Trade


def get_Trade(time):
    day = get_day(time)

    if day in TRADE_CLASS:
        return TRADE_CLASS[day]
    else:
        return create_Trade(day)


def get_time_from_str(time):
    if isinstance(time, str):
        time = _time.strptime(time, '%Y-%m-%d %H:%M:%S')
        time = _time.mktime(time)

    return time


def get_day(time):
    if 0 <= time < 50000:
        return time
    elif 1e9 < time < 1e10:
        return time * 1000 // MS_IN_DAY
    elif 1e12 < time < 1e13:
        return time // MS_IN_DAY


def get_trade_list(symbol, start, end):
    with get_session() as session:
        start_time = get_time_from_str(start)
        end_time = get_time_from_str(end)
        Trade = get_Trade(int(start_time))
        data = Trade.get_data(session, symbol, start_time, end_time).all()
        if not data:
            return []

        trade_list = [
            # {
            #     'ts': int(start_time),
            #     'price': data[0].price,
            #     'vol': 0,
            #     'acc_vol': 0
            # }
        ]

        last_ts = int(start_time)
        last_price = data[0].price
        sum_vol = 0
        acc_vol = 0
        for trade in data:
            ts = int(float(trade.ts))
            price = trade.price
            vol = round(price * trade.amount, 4)

            if last_ts != ts:
                trade_list.append({
                    'ts': last_ts,
                    'price': last_price,
                    'vol': round(sum_vol, 4),
                    'acc_vol': round(acc_vol, 4)
                })

                last_ts = ts
                last_price = price
                sum_vol = vol
                acc_vol += vol
            else:
                sum_vol += vol
                acc_vol += vol
                last_price = price

        else:
            trade_list.append({
                'ts': last_ts,
                'price': last_price,
                'vol': round(sum_vol, 4),
                'acc_vol': round(acc_vol, 4)
            })

        return trade_list if len(trade_list) > 1 else []


def get_open_price(symbol, start):
    with get_session() as session:
        start_time = get_time_from_str(start)
        open_time = int(((start_time + MS_IN_DAY / 3) //
                        MS_IN_DAY - 1/3) * MS_IN_DAY)
        Trade = get_Trade(open_time)
        data = session.query(Trade).filter(
            Trade.symbol == symbol,
            Trade.ts >= str(open_time),
            Trade.ts < str(open_time + 300000)
        ).order_by(Trade.ts).first()
        return {'open': data.price}


def get_profit(name='', month=''):
    with get_session() as session:
        profit_human = Table('profit_human', Base.metadata,
                             autoload=True, autoload_with=session.bind)
        data = session.query(profit_human)
        if name:
            data = data.filter(profit_human.c.name == name)
        if month:
            data = data.filter(profit_human.c.month == month)
        data = data.all()
        res = [{
            'key': index,
            'profit_id': item.id,
            'name': item.name,
            'date': item.date_str.strftime('%Y-%m-%d'),
            'profit': item.profit,
            'percent': item.percent
        } for index, item in enumerate(data)]
        return res


def get_month_profit(name='', month=''):
    with get_session() as session:
        month_profit = Table('month_profit', Base.metadata,
                             autoload=True, autoload_with=session.bind)
        data = session.query(month_profit)
        if name:
            data = data.filter(month_profit.c.name == name)
        if month:
            data = data.filter(month_profit.c.month == month)
        data = data.all()
        res = [{
            'key': index,
            'name': item.name,
            'month': item.month,
            'profit': item.profit,
            'percent': item.percent,
            'fee': item.fee
        } for index, item in enumerate(data)]
        return res


def get_message(date, name, profit=0):
    with get_session() as session:
        data = session.query(Message).filter(
            Message.summary.like(f'{date}%{name[:3]}%'))
        if len(data.all()) > 1:
            data = data.filter(Message.summary.like(f'%{profit}%'))

        if len(data.all()) == 0:
            return '未找到记录'

        data = data[0]
        res = re.findall(r'(### 买入记录\n\n.*)\n### 总结', data.msg, re.DOTALL)
        if res:
            res = res[0]+'\n'
            res = re.sub(date + r' (.+?)000', r'\1', res)
            res = re.sub(r'\|[^~\|]+?\|\n', r'|\n', res)
            res = re.sub(r'\| (\d*?\.\d{0,3})\d*? \|\n', r'| \1 |\n', res)
            res = re.sub(r'----', r':----:', res)
            return res
        else:
            return '未找到记录'


def get_currency_day_profit(currency='', date=''):
    with get_session() as session:
        currency_day_profit = Table(
            'currency_day', Base.metadata, autoload=True, autoload_with=session.bind)
        data = session.query(currency_day_profit)
        if currency:
            data = data.filter(currency_day_profit.c.currency == currency)
        if date:
            data = data.filter(currency_day_profit.c.date == date)
        data = data.all()
        res = [{
            'key': index,
            'currency': item.currency,
            'date': item.date,
            'buy_tm': item.buy_tm,
            'sell_tm': item.sell_tm,
            'hold_tm': item.sell_tm - item.buy_tm,
            'buy': item.buy,
            'sell': item.sell,
            'profit': item.sell-item.buy,
            'percent': item.percent,
            'type': 1 if item.high_profit else (2 if item.high_loss else 0)
            # 0 for normal, 1 for high profit, 2 for high loss.
        } for index, item in enumerate(data)]
        return res


def get_record(profit_id='', currency='', date=''):
    with get_session() as session:
        record_human = Table('record_human', Base.metadata,
                             autoload=True, autoload_with=session.bind)
        data = session.query(record_human)
        if profit_id:
            data = data.filter(record_human.c.profit_id == profit_id)
        if currency:
            data = data.filter(record_human.c.currency == currency)
        if date:
            data = data.filter(record_human.c.date == date)
        data = data.all()
        res = [{
            'key': index,
            'name': item.name,
            'currency': item.currency,
            'date': item.date,
            'time': item.tm,
            'price': item.price,
            'amount': item.amount,
            'vol': round(item.vol, 2),
            'direction': item.direction,
        } for index, item in enumerate(data)]
        return res


def get_stat():
    with get_session() as session:
        stat = Table('currency_stat', Base.metadata,
                     autoload=True, autoload_with=session.bind)
        data = session.query(stat)
        data = data.all()
        res = [{
            'key': index,
            'currency': item.currency,
            'buy_times': item.buy_times,
            'profit_times': item.profit_times,
            'high_profit_times': item.high_profit_times,
            'high_loss_times': item.high_loss_times,
            'total_profit': item.total_profit,
            'total_percent': item.total_percent,
            'profit_percent': item.profit_percent,
            'high_profit_percent': item.high_profit_percent,
            'high_loss_percent': item.high_loss_percent
        } for index, item in enumerate(data)]
        return res

def get_bottom_day_profit(name='', date=''):
    res = []
    for db in PGNAMES:
        with get_session(db=db) as session:
            day_profit = Table('bottom_day_profit_human', Base.metadata,
                                autoload=True, autoload_with=session.bind)
            data = session.query(day_profit)
            if name:
                data = data.filter(day_profit.c.name == name)
            if date:
                data = data.filter(day_profit.c.date == date)
            data = data.all()
            res += [{
                'key': len(res)+index,
                'name': item.name,
                'date': item.date,
                'profit': item.profit,
                'profit_rate': item.profit_rate
            } for index, item in enumerate(data)]
    return res

def get_bottom_month_profit(name='', month=''):
    res = []
    for db in PGNAMES:
        with get_session(db=db) as session:
            month_profit = Table('bottom_month_profit_human', Base.metadata,
                                autoload=True, autoload_with=session.bind)
            data = session.query(month_profit)
            if name:
                data = data.filter(month_profit.c.name == name)
            if month:
                data = data.filter(month_profit.c.month == month)
            data = data.all()
            res += [{
                'key': len(res)+index,
                'name': item.name,
                'month': item.month,
                'profit': item.profit,
                'profit_rate': item.profit_rate,
                'fee': item.fee
            } for index, item in enumerate(data)]
    return res
    
def get_bottom_order_profit(name='', date='', symbol=''):
    res = []
    for db in PGNAMES:
        with get_session(db=db) as session:
            order_profit = Table('bottom_order_profit_human', Base.metadata,
                                autoload=True, autoload_with=session.bind)
            data = session.query(order_profit)
            if name:
                data = data.filter(order_profit.c.name == name)
            if date:
                data = data.filter(order_profit.c.sell_date == date)
            if symbol:
                data = data.filter(order_profit.c.symbol == symbol)
            data = data.all()
            res += [{
                'key': len(res)+index,
                'name': item.name,
                'symbol': item.symbol,
                'sell_tm': item.sell_tm,
                'sell_order_id': item.sell_order_id,
                'sell_price': item.sell_price,
                'sell_amount': item.sell_amount,
                'sell_vol': item.sell_vol,
                'buy_price': item.buy_price,
                'buy_amount': item.buy_amount,
                'buy_vol': item.buy_vol,
                'date': item.sell_date,
                'profit': item.profit,
                'profit_rate': item.profit_rate,
                'fee': item.fee
            } for index, item in enumerate(data)]
    return res

def get_bottom_order(name='', date='', symbol=''):
    res = []
    for db in PGNAMES:
        with get_session(db=db) as session:
            order = Table('bottom_order_human', Base.metadata,
                        autoload=True, autoload_with=session.bind)
            data = session.query(order)
            if name:
                data = data.filter(order.c.name == name)
            if date:
                data = data.filter(order.c.date == date)
            if symbol:
                data = data.filter(order.c.symbol == symbol)
            data = data.all()
            res += [{
                'key': len(res)+index,
                'name': item.name,
                'symbol': item.symbol,
                'tm': item.time,
                'order_id': item.order_id,
                'price': item.price,
                'amount': item.amount,
                'vol': item.vol,
                'date': item.date,
                'direction': item.direction,
                'status': item.status,
                'fee': item.fee
            } for index, item in enumerate(data)]
    return res

def get_bottom_holding(name='', date='', symbol=''):
    now_price = Redis().get_binance_price()
    res = []
    for db in PGNAMES:
        with get_session(db=db) as session:
            holding = Table('bottom_holding', Base.metadata,
                        autoload=True, autoload_with=session.bind)
            data = session.query(holding)
            if name:
                data = data.filter(holding.c.name == name)
            if date:
                data = data.filter(holding.c.date == date)
            if symbol:
                data = data.filter(holding.c.symbol == symbol)
            data = data.all()
            res += [{
                'key': len(res)+index,
                'name': item.name,
                'account': item.account,
                'symbol': item.symbol,
                'date': item.date,
                'price': now_price[item.symbol],
                'amount': item.amount,
                'vol': now_price[item.symbol] * item.amount,
                'buy_price': item.buy_price,
                'buy_vol': item.vol,
                'profit': now_price[item.symbol] * item.amount - item.vol,
                'profit_rate': now_price[item.symbol] / item.buy_price - 1 if item.buy_price else 0
            } for index, item in enumerate(data)]
    return res

def get_users():
    res = []
    for db in PGNAMES:
        with get_session(db=db) as session:
            users = Table('users', Base.metadata,
                        autoload=True, autoload_with=session.bind)
            data = session.query(users)
            data = data.all()
            res += [{
                'name': item.name,
            } for index, item in enumerate(data)]
    return res

if __name__ == '__main__':
    res = get_stat()
    print(res)

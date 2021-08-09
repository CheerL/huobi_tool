import os
import configparser
import time as _time
from sqlalchemy import Column, create_engine, VARCHAR, INTEGER, REAL, TEXT, func
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(ROOT, 'config.ini')
print(CONFIG_PATH)

config = configparser.ConfigParser()
config.read(CONFIG_PATH)

PGHOST = config.get('data', 'PGHost')
PGPORT = config.getint('data', 'PGPort')
PGUSER = config.get('data', 'PGUser')
PGPASSWORD = config.get('data', 'PGPassword')
PGNAME = config.get('data', 'PGDatabase')

Base = declarative_base()
TRADE_CLASS = {}
MS_IN_DAY = 60*60*24*1000




class Target(Base):
    __tablename__ = 'target'
    id = Column(INTEGER, primary_key=True)
    tm = Column(VARCHAR(15))
    targets = Column(VARCHAR(500))

    # @staticmethod
    # def from_redis(key, value):
    #     key = key.decode('utf-8')
    #     targets = value.decode('utf-8')
    #     tm = key.split('_')[1]
    #     return Target(
    #         tm=tm,
    #         targets=targets
    #     )

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
        result = session.query(func.sum(Profit.profit)).filter(Profit.account == str(account))
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
    engine = create_engine(f'postgresql://{user}:{password}@{host}:{port}/{db}')
    Session = sessionmaker(bind=engine)
    Base.metadata.bind=engine
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

        # @staticmethod
        # def from_redis(key, value):
        #     key = key.decode('utf-8')
        #     value = value.decode('utf-8')
        #     _, symbol, _, num = key.split('_')
        #     ts, price, amount, direction = value.split(',')
        #     return Trade(
        #         symbol=symbol,
        #         ts=str(int(ts)+int(num)/1000),
        #         price=float(price),
        #         amount=float(amount),
        #         direction = direction
        #     )

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
        trade_list = [
            # {
            #     'ts': int(float(trade.ts)),
            #     'price': trade.price,
            #     'vol': round(trade.price * trade.amount, 4)
            # }
            # for trade in data
        ]

        last_ts = int(start_time)
        last_price = 0
        sum_vol = 0
        acc_vol = 0
        for trade in data:
            ts = int(float(trade.ts))
            price = trade.price 
            vol = round(price * trade.amount, 4)

            if last_ts != ts:
                if not trade_list:
                    trade_list.append({
                        'ts': last_ts,
                        'price': price,
                        'vol': 0,
                        'acc_vol': 0
                    })
                else:
                    acc_vol += sum_vol
                    trade_list.append({
                        'ts': last_ts,
                        'price': last_price,
                        'vol': sum_vol,
                        'acc_vol': acc_vol
                    })

                last_ts = ts
                last_price = price
                sum_vol = vol
            else:
                sum_vol += vol
                last_price = price

        else:
            trade_list.append({
                'ts': last_ts,
                'price': last_price,
                'vol': sum_vol,
                'acc_vol': acc_vol + sum_vol
            })

        return trade_list



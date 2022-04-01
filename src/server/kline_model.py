from sqlalchemy import Column, create_engine, VARCHAR, INTEGER, REAL, BIGINT
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from utils import config, get_level
from user.binance_model import Candlestick
from user.binance import BinanceMarketClient as Market
import math
import time

PGHOST = config.get('data', 'PGHost')
PGPORT = config.getint('data', 'PGPort')
PGUSER = config.get('data', 'PGUser')
PGPASSWORD = config.get('data', 'PGPassword')
PGNAME = config.get('data', 'PGDatabase')
RHOST = config.get('data', 'RHost')
RPORT = config.getint('data', 'RPort')
RPASSWORD = config.get('data', 'RPassword')

# PGNAMES = [PGNAME, 'loss']

Base = declarative_base()
KLINE_CLASS = {}

market = Market()

def get_session(host=PGHOST, port=PGPORT, db=PGNAME, user=PGUSER, password=PGPASSWORD) -> Session:
    engine = create_engine(
        f'postgresql://{user}:{password}@{host}:{port}/{db}')
    Session = sessionmaker(bind=engine)
    Base.metadata.bind = engine
    Base.metadata.create_all()
    return Session()

class KlineRange(Base):
    __tablename__ = 'kline_range'
    id = Column(INTEGER, primary_key=True)
    start = Column(BIGINT)
    end = Column(BIGINT)
    symbol = Column(VARCHAR(50))
    level = Column(VARCHAR(20))
    last_update = Column(BIGINT)
    
    @classmethod
    def get_range(cls, session, symbol, level):
        try:
            data = session.query(cls).filter(
                cls.symbol == symbol,
                cls.level == level
            ).first()
            return data.start, data.end, data.last_update
        except:
            return 0, 0, 0
    
    @classmethod
    def update(cls, session, symbol, level, start, end):
        try:
            data = session.query(cls).filter(
                cls.symbol == symbol,
                cls.level == level
            ).first()
            data.start = start
            data.end = end
            data.last_update = int(time.time())
        except:
            data = cls(
                symbol=symbol,
                level=level,
                start=start,
                end=end,
                last_update=int(time.time())
            )
        session.merge(data)
        session.commit()

def create_Kline(level):
    class Kline(Base):
        __tablename__ = f'kline_{level}'
        id = Column(INTEGER, primary_key=True)
        symbol = Column(VARCHAR(50))
        ts = Column(BIGINT)
        open = Column(REAL)
        close = Column(REAL)
        high = Column(REAL)
        low = Column(REAL)
        volume = Column(REAL)
        turnover = Column(REAL)

        @classmethod
        def get_data(cls, session, symbol, start, end):
            data = session.query(cls).filter(
                cls.symbol == symbol,
                cls.ts >= str(start),
                cls.ts <= str(end)
            ).order_by(Kline.ts)
            return data

        @classmethod
        def add_klines(cls, session, symbol, klines: 'list[Candlestick]'):
            session.bulk_save_objects([
                cls(
                    symbol=symbol,
                    ts=kline.id,
                    open=kline.open,
                    close=kline.close,
                    high=kline.high,
                    low=kline.low,
                    volume=kline.amount,
                    turnover=kline.vol
                )
                for kline in klines
            ])

    Base.metadata.create_all()
    KLINE_CLASS[level] = Kline
    return Kline

def get_Kline(level):
    if level in KLINE_CLASS:
        return KLINE_CLASS[level]
    else:
        return create_Kline(level)
    
def get_klines(symbol, level, start, end):
    with get_session() as session:
        _, level_ts = get_level(level)
        Kline = get_Kline(level)
        saved_start, saved_end, last_update = KlineRange.get_range(session, symbol, level)
        
        if saved_start == saved_end == 0:
            new_klines = market.get_candlestick(symbol, level, start_ts=start, end_ts=end)
            saved_start, saved_end = start, end
        else:
            new_klines = []
            if start <= saved_start-level_ts:
                new_klines += market.get_candlestick(symbol, level, start_ts=start, end_ts=saved_start)
                saved_start = start
            if (
                (end >= saved_end + level_ts) or
                (saved_end <= end < saved_end+level_ts and time.time() > last_update+3)
            ):
                session.query(Kline).filter(
                    Kline.ts==saved_end-1,
                    Kline.symbol==symbol
                ).delete()
                new_klines += market.get_candlestick(symbol, level, start_ts=saved_end-1, end_ts=end)
                saved_end = end

        if new_klines:
            saved_end = int(math.floor(saved_end / float(level_ts)) * level_ts + 1)
            saved_start = int(math.ceil(saved_start / float(level_ts)) * level_ts)
            Kline.add_klines(session, symbol, new_klines)
            KlineRange.update(session, symbol, level, saved_start, saved_end)
            
        data = Kline.get_data(session, symbol, start, end).all()
        res = [{
            'timestamp': item.ts * 1000,
            'open': item.open,
            'close': item.close,
            'high': item.high,
            'low': item.low,
            'volume': item.volume,
            'turnover': item.turnover
        } for index, item in enumerate(data)]
        return res

def get_symbol_list():
    return {
        symbol: [info.value_precision, info.amount_precision]
        for symbol, info in market.all_symbol_info.items()
    }

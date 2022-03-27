from utils import user_config
from binance.spot import Spot
from user.base import BaseMarketClient
from user.binance_model import Candlestick, Symbol, Ticker

import os
import re

class BinanceMarketClient(BaseMarketClient):
    exclude_list = []

    def __init__(self, access_key=None, secret_key=None, **kwargs):
        super().__init__(**kwargs)
        if access_key == None and secret_key == None:
            access_key = user_config.get('setting', 'BinanceAccessKey')
            secret_key = user_config.get('setting', 'BinanceSecretKey')

        self.api = Spot(key=access_key, secret=secret_key)
        self.update_symbols_info()

    def get_all_symbols_info(self):
        return {
            info['symbol']: Symbol(info)
            for info in self.api.exchange_info()['symbols']
            if info['symbol'].endswith('USDT')
            and info['status'] == 'TRADING'
            and not 'DOWN' in info['symbol']
            and not re.search('\d', info['symbol'])
            and info['symbol'] not in []
        }

    def get_market_tickers(self, symbol=None, all_info=False, raw=False):
        if all_info:
            raw_tickers = self.api.ticker_24hr(symbol)
        else:
            raw_tickers = self.api.ticker_price(symbol)
        if raw:
            return raw_tickers
        return [Ticker(raw_ticker) for raw_ticker in raw_tickers]


    def get_candlestick(self, symbol, interval: str, limit=10, start_ts=None, end_ts=None, raw=False):
        if interval.endswith('day'):
            interval = interval.replace('day', 'd')
        elif interval.endswith('min'):
            if interval == '60min':
                interval = '1h'
            else:
                interval = interval.replace('min', 'm')
        elif interval.endswith('hour'):
            interval = interval.replace('hour', 'h')
        elif interval.endswith('week'):
            interval = interval.replace('week', 'w')
        elif interval.endswith('mon'):
            interval = interval.replace('mon', 'M')
        if start_ts and end_ts:
            raw_klines = []
            start_time = start_ts * 1000
            end_time = end_ts * 1000 - 1
            while True:
                klines = self.api.klines(symbol, interval, startTime=start_time, endTime=end_time, limit=1000)
                if klines:
                    raw_klines.extend(klines)
                    start_time = klines[-1][0] + 1

                    if len(klines) < 1000:
                        break
                    elif start_time > end_time:
                        break
                else:
                    break

        else:
            raw_klines = self.api.klines(symbol, interval, limit=limit)
        if raw:
            return reversed(raw_klines)
        return [Candlestick(kline) for kline in reversed(raw_klines)]
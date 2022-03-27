# from order import OrderSummary
# from report import wx_name
# from utils import logger, timeout_handle, user_config
# from retry import retry
# from target import BaseTarget as Target


class BaseMarketClient:
    exclude_list = []
    exclude_price = 10

    def __init__(self, **kwargs):
        self.all_symbol_info = {}
        self.symbols_info = {}
        self.mark_price: 'dict[str, float]' = {}

    def exclude(self, infos, base_price):
        return {
            symbol: info
            for symbol, info in infos.items()
            if symbol not in self.exclude_list
            and symbol in base_price
            and base_price[symbol] < self.exclude_price
        }

    def get_all_symbols_info(self):
        return {}

    def update_symbols_info(self) -> 'tuple[list[str], list[str]]':
        new_symbols_info = self.get_all_symbols_info()
        if len(self.all_symbol_info) != len(new_symbols_info):
            self.all_symbol_info = new_symbols_info

        price = self.get_price()
        symbols_info = self.exclude(new_symbols_info, price)
        new_symbols = [symbol for symbol in symbols_info.keys() if symbol not in self.symbols_info]
        removed_symbols = [symbol for symbol in self.symbols_info.keys() if symbol not in symbols_info]
        self.symbols_info = symbols_info
        self.mark_price = price
        return new_symbols, removed_symbols

    def get_market_tickers(self, **kwargs):
        raise NotImplementedError

    # @timeout_handle({})
    def get_price(self) -> 'dict[str, float]':
        return {
            pair.symbol: pair.close
            for pair in self.get_market_tickers()
        }

    # @timeout_handle({})
    def get_vol(self) -> 'dict[str, float]':
        return {
            pair.symbol: pair.vol
            for pair in self.get_market_tickers(all_info=True)
        }


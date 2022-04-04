from flask import Flask, jsonify, request
from flask_cors import CORS
import model
import kline_model

app = Flask(__name__)
CORS(app)

def api_creator(path, func, arg_list=[], methods=['POST']):
    def sub_api():
        args = request.json
        func_args = [args[arg_name] for arg_name in arg_list]
        return jsonify(func(*func_args))

    run_func = lambda : sub_api()
    run_func.__name__ = path

    return app.route(f'/api/{path}', methods=methods)(run_func)

api_creator('', model.get_trade_list, ['symbol', 'start', 'end'])
api_creator('open', model.get_open_price, ['symbol', 'start'])
api_creator('profit', model.get_profit, ['name', 'month'])
api_creator('month_profit', model.get_month_profit, ['name', 'month'])
api_creator('message', model.get_message, ['date', 'name', 'profit'])
api_creator('currency_day', model.get_currency_day_profit, ['currency', 'date'])
api_creator('record', model.get_record, ['profit_id', 'currency', 'date'])
api_creator('stat', model.get_stat)
api_creator('users', model.get_users, [])

api_creator('bottom/day_profit', model.get_bottom_day_profit, ['name', 'date'])
api_creator('bottom/month_profit', model.get_bottom_month_profit, ['name', 'month'])
api_creator('bottom/order_profit', model.get_bottom_order_profit, ['name', 'date', 'symbol'])
api_creator('bottom/order', model.get_bottom_order, ['name', 'date', 'symbol'])
api_creator('bottom/holding', model.get_bottom_holding, ['name', 'date', 'symbol'])

api_creator('klines', kline_model.get_klines, ['symbol', 'level', 'start', 'end'])
api_creator('klines/symbols', kline_model.get_symbol_list, [])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008, debug=True)

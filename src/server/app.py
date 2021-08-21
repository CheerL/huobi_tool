from flask import Flask, jsonify, request
from model import (
    get_trade_list, get_open_price, get_profit,
    get_message, get_month_profit, get_currency_day_profit,
    get_record, get_stat
    )
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['POST'])
def price():
    args = request.json
    trade_list = get_trade_list(args['symbol'], args['start'], args['end'])
    print(args, len(trade_list))
    return jsonify(trade_list)

@app.route('/open', methods=['POST'])
def open():
    args = request.json
    data = get_open_price(args['symbol'], args['start'])
    return jsonify(data)

@app.route('/profit', methods=['POST'])
def profit():
    args = request.json
    data = get_profit(args['name'], args['month'])
    return jsonify(data)

@app.route('/month_profit', methods=['POST'])
def month_profit():
    args = request.json
    data = get_month_profit(args['name'], args['month'])
    return jsonify(data)

@app.route('/message', methods=['POST'])
def message():
    args = request.json
    data = get_message(args['date'], args['name'], args['profit'])
    return jsonify(data)

@app.route('/currency_day', methods=['POST'])
def currency_day():
    args = request.json
    data = get_currency_day_profit(args['currency'], args['date'])
    return jsonify(data)

@app.route('/record', methods=['POST'])
def record():
    args = request.json
    data = get_record(args['profit_id'], args['currency'], args['date'])
    return jsonify(data)

@app.route('/stat', methods=['POST'])
def stat():
    # args = request.json
    data = get_stat()
    return jsonify(data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5008, debug=True)

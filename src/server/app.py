from flask import Flask, jsonify, request
from model import get_trade_list
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['POST'])
def index():
    args = request.json
    print(args)
    trade_list = get_trade_list(args['symbol'], args['start'], args['end'])
    print(len(trade_list))
    return jsonify(trade_list)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
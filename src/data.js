const url = process.env.NODE_ENV === 'development' ?
  // 'http://192.168.222.240:5008/api/' :
  'https://server.cheerl.space/api/' :
  'https://server.cheerl.space/api/'

const post = (postfix, postdata) => {
  return fetch(url + postfix, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postdata)
  }).then(res => {
    // const data = res.json()
    const data = res.json()
    return data
  }).catch(err => {
    throw err
  })
}

export const get_price_data = (symbol, start, end) => {
  const data = {
    'symbol': symbol,
    'start': start,
    'end': end
  }
  return post('', data)
}

export const get_open_price = (symbol, start) => {
  const data = {
    'symbol': symbol,
    'start': start,
  }
  return post('open', data)
}

export const get_profit = (name, month) => {
  const data = {
    'name': name,
    'month': month
  }
  return post('profit', data)
}

export const get_month_profit = (name, month) => {
  const data = {
    'name': name,
    'month': month
  }
  return post('month_profit', data)
}

export const get_message = (name, date, profit) => {
  const data = {
    'name': name,
    'date': date,
    'profit': profit
  }
  return post('message', data)
}

export const get_currency_day_profit = (currency, date) => {
  const data = {
    'date': date,
    'currency': currency
  }
  return post('currency_day', data)
}

export const get_record = (profit_id, currency, date) => {
  const data = {
    'profit_id': profit_id,
    'date': date,
    'currency': currency
  }
  return post('record', data)
}

export const get_stat = () => {
  const data = {}
  return post('stat', data)
}

export const get_bottom_day_profit = (name, date) => {
  const data = {
    'name': name,
    'date': date
  }
  return post('bottom/day_profit', data)
}

export const get_bottom_month_profit = (name, month) => {
  const data = {
    'name': name,
    'month': month
  }
  return post('bottom/month_profit', data)
}

export const get_bottom_order_profit = (name, date, symbol) => {
  const data = {
    'name': name,
    'date': date,
    'symbol': symbol
  }
  return post('bottom/order_profit', data)
}

export const get_bottom_order = (name, date, symbol) => {
  const data = {
    'name': name,
    'date': date,
    'symbol': symbol
  }
  return post('bottom/order', data)
}

export const get_bottom_holding = (name, date, symbol) => {
  const data = {
    'name': name,
    'date': date,
    'symbol': symbol
  }
  return post('bottom/holding', data)
}
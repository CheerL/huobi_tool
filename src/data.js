const url = 'http://34.150.119.94:5000/'

const post = (postfix, postdata) => {
  return fetch(url + postfix, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postdata)
  }).then(res => {
    const data = res.json()
    return data
  })
    .catch(err => {
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
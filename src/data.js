export const get_data = (symbol, start, end) => {
  return fetch('http://34.150.119.94:5000/', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      'symbol': symbol,
      'start': start,
      'end': end
    })
  })
    .then(res => {
      const data = res.json()
      return data
    })
    .catch(err => {
      throw err
    })
}
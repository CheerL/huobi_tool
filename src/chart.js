import React from 'react'
import moment from 'moment'
import { Chart, Axis, Geom, Tooltip } from 'bizgoblin';
import { DatePicker, List, InputItem, Button, WhiteSpace, WingBlank } from 'antd-mobile';
import { get_price_data, get_open_price } from './data'

export const PriceChart = () => {
  const [start, setStart] = React.useState('')
  const [end, setEnd] = React.useState('')
  const [symbol, setSymbol] = React.useState('')
  const [data, setData] = React.useState([
    { ts: 0, acc_vol: 0, vol: 0, price: 0, percent: 0 }
  ])
  const [open, setOpen] = React.useState(0)
  const [base, setBase] = React.useState(0)
  const [baseLoading, setBaseLoading] = React.useState(false)
  const [createLoading, setCreateLoading] = React.useState(false)

  const setDataWithBase = (base, old_data) => {
    const new_data = old_data.map(item => ({ ...item, percent: (item.price / base - 1) * 100 }))
    setBase(base)
    setData(new_data)
  }

  const updateDate = () => {
    const start_ts = start.getTime()
    const start_time = start_ts - start_ts % 60000
    const end_ts = end.getTime()
    const end_time = end_ts - end_ts % 60000
    setCreateLoading(true)
    get_price_data(symbol, start_time, end_time)
      .then(res => {
        setDataWithBase(res[0].price, res)
      })
      .catch(err => {
        console.log(err)
        throw err
      })
      .finally(() => {
        setCreateLoading(false)
      })
  }

  const updateBase = () => {
    const start_ts = start.getTime()
    const start_time = start_ts - start_ts % 60000
    setBaseLoading(true)
    get_open_price(symbol, start_time)
      .then(res => {
        setDataWithBase(res.open, data)
        setOpen(res.open)
      })
      .catch(err => {
        console.log(err)
        throw (err)
      })
      .finally(() => {
        setBaseLoading(false)
      })
  }

  return <>
    {data.length > 1 ? <PriceChartView data={data} /> : <div style={{ padding: '30vh 0 29vh 0' }}>无数据</div>}
      <List>
        <DatePicker value={start} onChange={setStart}>
          <List.Item arrow="horizontal">开始时间</List.Item>
        </DatePicker>
        <DatePicker value={end} onChange={setEnd}>
          <List.Item arrow="horizontal">结束时间</List.Item>
        </DatePicker>
        <InputItem value={symbol} onChange={setSymbol} style={{ textAlign: 'right' }}>
          币种
        </InputItem>
        <InputItem type='digit' value={base} onChange={val => { setDataWithBase(val, data) }} style={{ textAlign: 'right' }}>
          基准价格
        </InputItem>
        <WingBlank>
        <Button
          type='primary' onClick={updateDate} loading={createLoading}
          disabled={ symbol === '' || start === '' || end === '' }
        >生成图表
        </Button>
        <WhiteSpace />
        <Button
          type='primary' onClick={updateBase} loading={baseLoading}
          disabled={ symbol === '' || start === '' || data.length === 1 || open === Number(base) }
        >获取开盘价
        </Button>
        <WhiteSpace />
        </WingBlank>
      </List>
    
  </>
}


const time_formatter = ts => {
  return moment(ts).format('HH:mm:ss.SSS')
}

const onShowTooltip = ev => {
  const item = { ...ev.items[0] }
  item.name = '单笔交易量'
  item.marker = { ...item.marker, fill: '#d3f5ff' }
  item.value = String(item.origin.vol.toFixed(3))
  ev.items.push(item)

  const item2 = { ...ev.items[0] }
  item2.name = '涨幅'
  item2.marker = { ...item2.marker, fill: item2.origin.percent > 0 ? 'red' : 'green' }
  item2.value = `${item2.origin.percent.toFixed(3)}%`
  ev.items.push(item2)

  ev.items[0].name = '价格'
  ev.items[1].name = '累计交易量'
  ev.items[1].marker.fill = '#a8cbd5'
  ev.items[1].value = String(item.origin.acc_vol.toFixed(3))

}

const PriceChartView = React.memo(({ data }) => {
  const ts_list = data.map(item => item.ts)
  const defs = [
    { dataKey: 'ts', type: 'linear', nice: false, formatter: time_formatter, min: Math.min(...ts_list), max: Math.max(...ts_list) },
    { dataKey: 'price', tickCount: 5 },
    { dataKey: 'acc_vol', tickCount: 5 }
  ]
  return <Chart width="100%" height='150%' padding={[90, 50, 'auto', 50]} data={data} defs={defs} pixelRatio={window.devicePixelRatio * 2} >
    <Axis dataKey='ts' label={{ rotate: -0.7 }} labelOffset={30} />
    <Axis dataKey='price' />
    <Axis dataKey='acc_vol' />
    <Tooltip showCrosshairs showTitle onShow={onShowTooltip} />
    <Geom geom='line' position='ts*price' color='#00adff' />
    {data.length < 100 ? <Geom geom='point' position='ts*price' color='#00adff' /> : null}
    <Geom geom='area' position='ts*acc_vol' color='#3aa5d8' />
  </Chart>
})

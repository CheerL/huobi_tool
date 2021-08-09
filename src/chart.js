import React from 'react'
import { Chart, Axis, Geom, Tooltip } from 'bizgoblin';
import { get_data } from './data'
import moment from 'moment'
import { DatePicker, List, InputItem, Button } from 'antd-mobile';

export const Selecter = () => {
  const [start, setStart] = React.useState('')
  const [end, setEnd] = React.useState('')
  const [symbol, setSymbol] = React.useState('')
  const [data, setData] = React.useState([{ts:0, acc_vol:0, vol:0, price: 0}])
  const updateDate = () => {
    const start_ts = start.getTime()
    const start_time = start_ts - start_ts % 60000
    const end_ts = end.getTime()
    const end_time = end_ts - end_ts % 60000
    get_data(symbol, start_time, end_time)
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        throw err
      })
  }

  return <>
    {data.length > 1 ? <MyChart data={data} /> : <div style={{padding: '31vh 0 31vh 0'}}>无数据</div>}
    <List>
    <DatePicker value={start} onChange={setStart}>
      <List.Item arrow="horizontal">开始时间</List.Item>
    </DatePicker>
    <DatePicker value={end} onChange={setEnd}>
      <List.Item arrow="horizontal">结束时间</List.Item>
    </DatePicker>
    <InputItem value={symbol} onChange={setSymbol} style={{textAlign: 'right'}}>
      币种
    </InputItem>
    <Button type='primary' onClick={updateDate}>生成图表</Button>
  </List>
  </>
}


const time_formatter = ts => {
  return moment(ts).format('HH:mm:ss.SSS')
}

const onShowTooltip = ev => {
  const item = {...ev.items[0]}
  item.name = '单笔交易量'
  item.marker = {...item.marker, fill: '#d3f5ff'}
  item.value = String(item.origin.vol)
  ev.items.push(item)
  ev.items[0].name = '价格'
  ev.items[1].name = '累计交易量'
  ev.items[1].marker.fill = '#a8cbd5'

}

const MyChart = React.memo(({data}) => {
  console.log(data)
  const ts_list = data.map(item => item.ts)
  const defs = [
    { dataKey: 'ts', type: 'linear', nice: false, formatter: time_formatter, min: Math.min(...ts_list), max: Math.max(...ts_list)},
    { dataKey: 'price' , tickCount: 5},
    { dataKey: 'acc_vol', tickCount: 5}
  ]
  return <Chart width="100%" height='160%' padding={[90, 50, 'auto', 50]} data={data} defs={defs} pixelRatio={window.devicePixelRatio*2} >
    <Axis dataKey='ts' label={{rotate: -0.7}} labelOffset={30}/>
    <Axis dataKey='price' />
    <Axis dataKey='acc_vol' />
    <Tooltip showCrosshairs showTitle onShow={onShowTooltip} />
    <Geom geom='line' position='ts*price' color='#00adff' />
    {data.length < 100 ? <Geom geom='point' position='ts*price' color='#00adff' /> : null}
    <Geom geom='area' position='ts*acc_vol' color='#3aa5d8'/>
  </Chart>
})

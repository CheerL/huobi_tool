import React from 'react'
import moment from 'moment'
// import Line from 'bizcharts/lib/geometry/Line'
// import Area from 'bizcharts/lib/geometry/Area'
// import Chart from 'bizcharts/lib/components/Chart'
// import Axis from 'bizcharts/lib/components/Axis'
// import Slider from 'bizcharts/lib/components/Slider'
// import Effects from 'bizcharts/lib/components/Effects'
// import { DataMarker } from 'bizcharts/lib/components/Annotation'
import { Chart, Line, Area, Axis, Slider, Effects, Annotation } from 'bizcharts'
import { DatePicker, List, InputItem, Button, WhiteSpace, WingBlank } from 'antd-mobile';
import FilterDropdown from 'antd/lib/table/hooks/useFilter/FilterDropdown'
import { get_price_data, get_open_price, get_record } from './data'

export const PriceChart = () => {
  const [start, setStart] = React.useState('')
  const [end, setEnd] = React.useState('')
  const [symbol, setSymbol] = React.useState('')
  const [data, setData] = React.useState([])
  const [record, setRecord] = React.useState([])
  const [filterKeys, setFilterKeys] = React.useState([])
  const [open, setOpen] = React.useState(0)
  const [base, setBase] = React.useState(0)
  const [baseLoading, setBaseLoading] = React.useState(false)
  const [createLoading, setCreateLoading] = React.useState(false)

  const createChart = () => {
    const start_ts = start.getTime()
    const start_time = start_ts - start_ts % 60000
    const end_ts = end.getTime()
    const end_time = end_ts - end_ts % 60000
    setCreateLoading(true)
    get_record('', symbol.slice(0, -4).toUpperCase(), moment(start).format('YYYY-MM-DD'))
      .then(res => {
        setRecord(res.map(item => ({
          ...item,
          ts: (new Date(`${item.date} ${item.time}`)).getTime()
        })))
        const names = res.filter(item => item.direction === 'buy').map(item => item.name)
        setFilterKeys(names)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
    get_price_data(symbol, start_time, end_time)
      .then(res => {
        if (res.length > 0) {
          setBase(res[0].price)
        }
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
      .finally(() => {
        setCreateLoading(false)
      })
  }

  const getBase = () => {
    const start_ts = start.getTime()
    const start_time = start_ts - start_ts % 60000
    setBaseLoading(true)
    get_open_price(symbol, start_time)
      .then(res => {
        setBase(res.open)
        setOpen(res.open)
      })
      .catch(err => {
        console.log(err)
        // throw (err)
      })
      .finally(() => {
        setBaseLoading(false)
      })
  }
  return <>
    <FilterDropdown
      tablePrefixCls="ant-table"
      prefixCls="ant-table-filter"
      dropdownPrefixCls="ant-dropdown"
      column={{
        dataIndex: 'name',
        filters: record.filter(item => item.direction === 'buy').map(item => ({ text: item.name, value: item.name })),
      }}
      filterMultiple={true}
      columnKey='name'
      filterState={{
        column: { dataIndex: 'name', filters: [] },
        key: 'name',
        filteredKeys: filterKeys
      }}
      triggerFilter={(filterState) => {
        const keys = filterState.filteredKeys === null ? [] : filterState.filteredKeys
        setFilterKeys(keys)
      }}
      locale={{
        "filterTitle": "筛选",
        "filterConfirm": "确定",
        "filterReset": "重置",
        "filterEmptyText": "无筛选项",
      }}
    />
    <PriceChartView data={data} base={base} record={record} filterKeys={filterKeys} />
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
      <InputItem type='digit' value={base} onChange={setBase} style={{ textAlign: 'right' }}>
        基准价格
      </InputItem>
      <WingBlank>
        <Button
          type='primary' onClick={createChart} loading={createLoading}
          disabled={symbol === '' || start === '' || end === ''}
        >生成图表
        </Button>
        <WhiteSpace />
        <Button
          type='primary' onClick={getBase} loading={baseLoading}
          disabled={symbol === '' || start === '' || data.length === 1 || open === Number(base)}
        >获取开盘价
        </Button>
        <WhiteSpace />
      </WingBlank>
    </List>
  </>
}

const PriceChartView = React.memo(({ data, base, record, filterKeys }) => {
  const ts_list = data.map(item => item.ts)
  const min_ts = Math.min(...ts_list)
  const max_ts = Math.max(...ts_list)
  const scale = {
    'ts': { type: 'time', nice: false, mask: 'HH:mm:ss.SSS', alias: '时间' },
    'price': { type: 'linear-strict', nice: false, tickCount: 5, alias: '价格' },
    'acc_vol': { type: 'linear-strict', nice: false, tickCount: 5, alias: '累计成交额' },
    'vol': { type: 'linear', nice: false, tickCount: 5, alias: '单笔成交额' }
  }
  return <Chart
    appendPadding={[0, 5, 5, 5]} //上 右 下 左
    autoFit
    height={600}
    data={data}
    pixelRatio={window.devicePixelRatio * 2}
    placeholder
    scale={scale}
    animate={false}
  >
    <Axis name='ts' position='bottom' />
    <Axis name='price' position='left' title verticalFactor={1} label={{ autoHide: true, autoEllipsis: true }} />
    <Axis name='acc_vol' position='right' title verticalFactor={-1} />
    <Line position="ts*price" color='#00adff' />
    <Area position='ts*acc_vol' color='#3aa5d8' />
    <Effects>
      {
        chart => {
          chart.tooltip({
            shared: true,
            showCrosshairs: true,
            customItems: items => {
              const origin = items[0].data
              const percent = ((origin.price / base - 1) * 100).toFixed(2)
              return [
                {
                  "name": "价格",
                  "value": origin.price,
                  "color": '#00adff',
                  "marker": true,
                },
                {
                  "name": "累计成交额",
                  "value": origin.acc_vol.toFixed(2),
                  "color": '#3aa5d8',
                  "marker": true,
                },
                {
                  "name": "单笔成交额",
                  "value": origin.vol.toFixed(2),
                  "color": "#d3f5ff",
                  "marker": true,
                },
                {
                  "name": "涨幅",
                  "value": `${percent}%`,
                  "color": percent > 0 ? 'red' : 'green',
                  "marker": true
                }
              ]
            }
          })
        }
      }
    </Effects>
    <Slider
      formatter={ts => moment(ts).format('HH:mm:ss.SSS')}
      handlerStyle={{
        width: 20,
        height: 30
      }}
    />
    {record.filter(item => (!Array.isArray(filterKeys) ||
      (filterKeys.length > 0 && filterKeys.includes(item.name)))
      && item.ts <= max_ts && item.ts >= min_ts
    )
      .map((item, index) => {
        return <Annotation.DataMarker
          key={index}
          position={[item.ts, item.price]}
          point={{ style: { stroke: item.direction === 'buy' ? '#ff4d4f' : '#26ff0c' } }}
          text={{ content: item.name }}
        />
      })}
  </Chart>
})
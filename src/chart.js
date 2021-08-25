import React from 'react'
import moment from 'moment'
// import Line from 'bizcharts/lib/geometry/Line'
// import Area from 'bizcharts/lib/geometry/Area'
// import Chart from 'bizcharts/lib/components/Chart'
// import Axis from 'bizcharts/lib/components/Axis'
// import Slider from 'bizcharts/lib/components/Slider'
// import Effects from 'bizcharts/lib/components/Effects'
// import { DataMarker } from 'bizcharts/lib/components/Annotation'
import { Chart, Line, Axis, Effects, Annotation, View, Interval } from 'bizcharts'
import { DatePicker, List, InputItem, Button, WhiteSpace, WingBlank } from 'antd-mobile';
import FilterDropdown from 'antd/lib/table/hooks/useFilter/FilterDropdown'
import { get_price_data, get_open_price, get_record } from './data'
import { Space, Slider } from 'antd'

const toZeroOClock = date => {
  const msInHour = 60 * 60 * 1000
  return new Date(date.getTime() - (date.getTime() + 8 * msInHour) % (24 * msInHour))
}

export const PriceChart = () => {
  const [start, _setStart] = React.useState(toZeroOClock(new Date()))
  const [end, _setEnd] = React.useState(toZeroOClock(new Date()))
  const [symbol, setSymbol] = React.useState('')
  const [data, setData] = React.useState([])
  const [record, setRecord] = React.useState([])
  const [filterKeys, setFilterKeys] = React.useState([])
  const [open, setOpen] = React.useState(0)
  const [base, setBase] = React.useState(0)
  const [baseLoading, setBaseLoading] = React.useState(false)
  const [createLoading, setCreateLoading] = React.useState(false)
  const startRef = React.useRef()
  const endRef = React.useRef()

  const setStart = val => {
    const ts = val.getTime()
    _setStart(new Date(ts - ts % 60000))
  }

  const setEnd = val => {
    const ts = val.getTime()
    _setEnd(new Date(ts - ts % 60000))
  }

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
        console.log(res)
        if (res.length > 0) {
          // res = res.map(item => ({
          //   "acc_vol": Number(item.acc_vol),
          //   "price": Number(item.price),
          //   "ts": Number(item.ts),
          //   "vol": Number(item.vol)
          // }))
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

  const onClickNow = (ref, value, setValue) => () => {
    const tm = new Date()
    ref.current.setScrollValue(tm)
    setValue(tm)
  }
  const onClickZero = (ref, value, setValue) => () => {
    const baseTm = (ref.current.scrollValue === null || ref.current.scrollValue === undefined) ? value : ref.current.scrollValue
    const tm = toZeroOClock(baseTm)
    ref.current.setScrollValue(tm)
    setValue(tm)
  }
  const onClickFollow = (ref, value, setValue) => () => {
    ref.current.setScrollValue(start)
    setValue(start)
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
      <DatePicker value={start} onChange={setStart} ref={startRef}
        title={
          <Space size={40}>
            <div onClick={onClickNow(startRef, start, setStart)} className='am-picker-popup-item'>现在</div>
            <div onClick={onClickZero(startRef, start, setStart)} className='am-picker-popup-item'>零点</div>
          </Space>
        }>
        <List.Item arrow="horizontal">开始时间</List.Item>
      </DatePicker>
      <DatePicker value={end} onChange={setEnd} ref={endRef}
        title={
          <Space size={40}>
            <div onClick={onClickNow(endRef, end, setEnd)} className='am-picker-popup-item'>现在</div>
            <div onClick={onClickFollow(endRef, end, setEnd)} className='am-picker-popup-item'>跟随</div>
          </Space>
        }>
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

const groupby_inteval = (data, interval) => {
  let group = {}
  data.forEach(item => {
    let ts = item.ts - item.ts % interval
    if (group[ts] === undefined) {
      group[ts] = item
      group[ts].ts = ts
    } else {
      group[ts].vol += item.vol
      group[ts].acc_vol += item.acc_vol
    }
  })
  return Object.keys(group).map(ts => group[ts])
}

const PriceChartView = React.memo(({ data, base, record, filterKeys }) => {
  const max_step = 1000
  // const grouped_data = groupby_inteval(data, 10)
  const [chartHeight, setChartHeight] = React.useState(Math.min(400, window.innerHeight - 20))
  const [start, setStart] = React.useState(0)
  const [end, setEnd] = React.useState(max_step)
  const ts_list = data.map(item => item.ts)
  const data_size = ts_list.length
  const min_ts = Math.min(...ts_list)
  const max_ts = Math.max(...ts_list)
  const scale = {
    'ts': { type: 'time', nice: false, mask: 'HH:mm:ss.SSS', alias: '时间' },
    'price': { type: 'linear-strict', nice: false, tickCount: 5, alias: '价格' },
    'acc_vol': { type: 'linear-strict', nice: false, tickCount: 3, alias: '累计成交额' },
    'vol': { type: 'linear-strict', nice: false, tickCount: 3, alias: '单笔成交额' }
  }
  const onSliderChange = chart => val => {
    const [min, max] = val
    setStart(min)
    setEnd(max)
    if (data_size <= 0) {
      return
    }
    const minTs = min_ts + min / max_step * (max_ts - min_ts)
    const maxTs = min_ts + max / max_step * (max_ts - min_ts);
    const filterFunc = ts => {
      return ts <= maxTs && ts >= minTs
    }
    chart.views.forEach(view => {
      view.filter('ts', filterFunc);
    });
    chart.render(true);
  }
  const sliderTipFormatter = val => {
    const ts = Math.floor(val / max_step * (max_ts - min_ts) + min_ts)
    return moment(ts).format('HH:mm:ss.SSS')
  }

  React.useEffect(() => {
    window.addEventListener('resize', () => {
      setChartHeight(Math.min(400, window.innerHeight - 20))
    })
  }, [])

  return <Chart
    appendPadding={[10, 5, 5, 5]} //上 右 下 左
    autoFit
    height={chartHeight}
    data={data}
    pixelRatio={window.devicePixelRatio * 2}
    placeholder
    scale={scale}
    animate={false}
  >
    <Effects>
      {
        chart => {
          chart.tooltip({
            shared: true,
            showCrosshairs: true,
            position: 'top',
            follow: false,
            containerTpl: '<div class="g2-tooltip">'
              + '<div class="g2-tooltip-title"></div>'
              + '<div class="g2-tooltip-list"></div>'
              + '</div>',
            itemTpl: '<div class="g2-tooltip-list-item" data-index={name}>'
              + '<span class="g2-tooltip-name">'
              + '<span class="g2-tooltip-marker" style="background-color:{color}"></span>'
              + '{name}</span>'
              + '<span class="g2-tooltip-value">{value}</span>'
              + '</div>',
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
          return <Slider
            className='chart-slider'
            range={{ draggableTrack: true }}
            max={max_step} min={0}
            value={[start, end]}
            tipFormatter={sliderTipFormatter}
            tooltipPlacement={'bottom'}
            onChange={onSliderChange(chart)}
          />
        }
      }
    </Effects>
    <View data={data} region={{ start: { x: 0, y: 0 }, end: { x: 1, y: 0.75 } }}>
      {/* <Axis name='ts' position='bottom' label={null} /> */}
      <Axis name='ts' position='bottom' label={{ formatter: (text) => text.slice(0, 8), autoEllipsis: true, style: { fontSize: 10, textAlign: 'center' } }} />
      <Axis name='price' position='right' verticalFactor={1} label={{ autoEllipsis: true, style: { fontSize: 10, textAlign: 'end' } }} />
      <Line position="ts*price" color='#00adff' />
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
    </View>
    <View theme={{
      maxColumnWidth: 20,
      minColumnWidth: 1,
      columnWidthRatio: 1
    }} data={data} region={{ start: { x: 0, y: 0.77 }, end: { x: 1, y: 0.95 } }}>
      <Interval position='ts*vol' />
      {/* <Axis name='ts' position='bottom' label={{ autoEllipsis: true, style: { fontSize: 10, textAlign: 'start', } }} /> */}
      {/* <Axis name='ts' position='bottom' label={null} /> */}
      <Axis tickLine={null} name='ts' position='bottom' label={{ formatter: (text) => text.slice(0, 8), autoEllipsis: true, style: { fontSize: 10, textAlign: 'center', fill: '#f5f5f9' } }} />
      <Axis name='vol' position='right' verticalFactor={1} grid={null} label={{ autoEllipsis: true, style: { fontSize: 10 } }} />
      {/* <Slider
        formatter={ts => moment(ts).format('HH:mm:ss.SSS')}
        handlerStyle={{width: 20, height: 30}}
        start={start} end={end}
      /> */}
    </View>
  </Chart>
})
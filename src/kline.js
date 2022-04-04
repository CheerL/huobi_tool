import React, { useEffect } from 'react'
import { init, dispose } from 'klinecharts'
import { useParams, useHistory } from 'react-router-dom';
import './kline.css'
import { Layout, Row, Col, Button, Popover, Checkbox, InputNumber, Select, message } from 'antd';
import { get_klines, get_symbol_list } from './data' 
import { CaretLeftFilled } from '@ant-design/icons'
import moment from 'moment'
import { get_bottom_order } from './data';

const { Header, Content } = Layout;

/**
 * 计算布林指标中的标准差
 * @param dataList
 * @param ma
 * @return {number}
 */
const getBollMd = (dataList, ma) => {
  var dataSize = dataList.length;
  var sum = 0;
  dataList.forEach(function (data) {
    var closeMa = data.close - ma;
    sum += closeMa * closeMa;
  });
  var b = sum > 0;
  sum = Math.abs(sum);
  var md = Math.sqrt(sum / dataSize);
  return b ? md : -1 * md;
}

const getBoll = (dataList, _ref) => {
  var params = _ref.params;
  var p = params[0] - 1;
  var closeSum = 0;
  return dataList.map(function (kLineData, i) {
    var close = kLineData.close;
    var boll = {};
    closeSum += close;

    if (i >= p) {
      boll.mid = closeSum / params[0];
      var md = getBollMd(dataList.slice(i - p, i + 1), boll.mid);
      boll.up = boll.mid + params[1] * md;
      boll.dn = boll.mid - params[1] * md;
      closeSum -= dataList[i - p].close;
    }

    return boll;
  });
}

const generateBollTemplate = params => {
  const baseUpColor = 'ffbb50'
  const baseMidColor = 'bb84dd'
  const baseDownColor = '51abff'
  return {
    name: params.name,
    shortName: params.name,
    calcParams: [20, 2],
    plots: [{
      key: 'up',
      title: 'UP: ',
      type: 'line',
      color: '#' + (parseInt(baseUpColor, 16) - parseInt('0c0c00', 16) * params.key).toString(16)
    }, {
      key: 'mid',
      title: 'MID: ',
      type: 'line',
      color: '#' + (parseInt(baseMidColor, 16) - parseInt('0a000a', 16)  * params.key).toString(16)
    }, {
      key: 'dn',
      title: 'DN: ',
      type: 'line',
      color: '#' + (parseInt(baseDownColor, 16) - parseInt('d', 16) * params.key).toString(16)
    }],
    calcTechnicalIndicator: getBoll,
    ...params.params
  };
}
const levelTsMap = {
  '1min': 60,
  '5min': 300,
  '15min': 900,
  '30min': 1800,
  '1hour': 3600,
  '2hour': 7200,
  '4hour': 14400,
  '6hour': 21600,
  '8hour': 28800,
  '12hour': 43200,
  '1day': 86400
}

const updateStartEnd = (init_num, level) => {
  let levelTs = levelTsMap[level]
  let now = new Date() / 1000
  return [Math.floor(now / levelTs - init_num + 1) * levelTs, Math.floor(now / levelTs) * levelTs + 1]
}

const load = {
  message: undefined,
  loading_text: '数据加载中',
  loaded_text: '数据加载完成',
  loading_duration: 0,
  loaded_duration: 1,
  loading() {
    this.message = message.loading(this.loading_text, this.loading_duration)
  },
  loaded() {
    if (this.message) {
      this.message()
      this.message = undefined
      message.success(this.loaded_text, this.loaded_duration)
    }
  }
}

const annotationDrawExtend = (ctx, coordinate, texts, direction, color) => {
  const num = texts.length
  const { x:X, y:Y }= coordinate
  ctx.font = '9px'
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 1
  ctx.strokeStyle = color

  const triangleWidth = 8
  const triangleHeight = 10
  
  const triangleBegin = 25
  const triangleYBegin = Y + direction * triangleBegin
  const triangleYEnd = Y + direction * (triangleBegin + triangleHeight)
  
  const textWidth = Math.max(...texts.map(text => ctx.measureText(text).width))
  const rectWidth = textWidth + 8
  const rectHeight = direction * (num * 12 + 4)
  const rectX = X - rectWidth / 2
  const rectY = triangleYEnd

  ctx.beginPath()
  ctx.moveTo(X, triangleYBegin)
  ctx.lineTo(X - triangleWidth / 2, triangleYEnd)
  ctx.lineTo(rectX, rectY)
  ctx.lineTo(rectX, rectY + rectHeight)
  ctx.lineTo(rectX + rectWidth, rectY + rectHeight)
  ctx.lineTo(rectX + rectWidth, rectY)
  ctx.lineTo(X + triangleWidth / 2, triangleYEnd)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = color
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  if (direction === -1) {
    [...texts].reverse().forEach((text, i) => {
      ctx.fillText(text, rectX+4, rectY + direction * (9 + 12 * i))
    })
  } else {
    texts.forEach((text, i) => {
      ctx.fillText(text, rectX+4, rectY + direction * (9 + 12 * i))
    })
  }
  
}

export const KLineChart = () => {
  const initKlineNum = 1000
  const update_ts = 5
  const domId = 'kline'
  const candlePane = 'candle_pane'
  const history = useHistory()
  const url_param = useParams()
  if (url_param.symbol === undefined) {
    url_param.symbol = 'BTCUSDT'
  }
  if (url_param.level===undefined) {
    url_param.level = '4hour'
  }

  const [BollParams, setBollParams] = React.useState({
    BOLL1: { name: 'BOLL1', key: 0, params: {calcParams: [20, { value: 2, allowDecimal: true }], precision: 4}, show: true},
    BOLL2: { name: 'BOLL2', key: 1, params: {calcParams: [40, { value: 2, allowDecimal: true }], precision: 4}, show: false},
    BOLL3: { name: 'BOLL3', key: 2, params: {calcParams: [80, { value: 2, allowDecimal: true }], precision: 4}, show: false},
    BOLL4: { name: 'BOLL4', key: 3, params: {calcParams: [120, { value: 2, allowDecimal: true }], precision: 4}, show: false},
    BOLL5: { name: 'BOLL5', key: 4, params: {calcParams: [160, { value: 2, allowDecimal: true }], precision: 4}, show: false},
    BOLL6: { name: 'BOLL6', key: 5, params: {calcParams: [240, { value: 2, allowDecimal: true }], precision: 4}, show: false},
    BOLL7: { name: 'BOLL7', key: 6, params: {calcParams: [480, { value: 2, allowDecimal: true }], precision: 4}, show: false},
  })
  const [Kline, setKline] = React.useState()
  const [symbolList, setSymbolList] = React.useState({})
  const [symbol, setSymbol] = React.useState(url_param.symbol.toUpperCase())
  const [level, setLevel] = React.useState(url_param.level)
  const [orders, setOrders] = React.useState([])
  // const [showOrders, setShowOrders] = React.useState([])
  const [showOrdersUpdate, setShowOrdersUpdate] = React.useState(0)

  const onSymbolChange = newSymbol => {
    if (newSymbol !== symbol) {
      setSymbol(newSymbol)
    }
  }
  const onLevelChange = newLevel => {
    if (newLevel !== level) {
      setLevel(newLevel)
    }
  }

  const updateBollParams = (newParams) => {
    if (Kline) {
      Object.keys(newParams).forEach(name => {
        let load = newParams[name]
        if (!BollParams.hasOwnProperty(name)) {
          return
        }

        let oldShow = BollParams[name].show
        if (load.hasOwnProperty('show') && typeof load.show !== 'boolean') {
          delete load.show
        }

        BollParams[name] = {...BollParams[name], ...load}

        if (load.hasOwnProperty('show') && load.show !== oldShow) {
          if (load.show) {
            Kline.createTechnicalIndicator({name: name, ...BollParams[name].params}, true, {id: candlePane})
          } else {
            Kline.removeTechnicalIndicator(candlePane, name)
          }
        } else if (BollParams[name].show && load.hasOwnProperty('params')) {
          Kline.overrideTechnicalIndicator({name: name, ...BollParams[name].params}, candlePane)
        }
      })
      setBollParams({...BollParams})
      
      let showNum = 0
      Object.keys(BollParams).forEach(name => {
        let load = BollParams[name]
        if (load.show) {
          showNum += 1
        }
      })

      Kline.setStyleOptions({
        candle: {
          tooltip: {
            rect: {
              offsetTop: 5+15 * showNum
            }
          }
        }
      })
    }
  }

  useEffect(() => {
    if (Kline && Object.keys(symbolList).length > 0 && symbolList[symbol] !== undefined) {
      const [pricePrecision, amountPrecision] = symbolList[symbol]
      Kline.setPriceVolumePrecision(pricePrecision, amountPrecision)
      const newBollParams = {...BollParams}
      Object.keys(newBollParams).forEach(
        name => newBollParams[name].params.precision = pricePrecision
      )
      updateBollParams(newBollParams)
    }
  }, [Kline, symbolList, symbol])

  useEffect(() => {
    const levelTs = levelTsMap[level]
    const showDict = {}
    if (Kline && orders.length) {
      const now = moment().valueOf()
      orders.forEach(item => {
        let ts = moment(item.tm).valueOf()
        let timestamp = item.status === '完成' ? 
          ts - ts % (levelTs * 1000): 
          now - now % (levelTs * 1000)
        let key = `${timestamp}${item.direction}${item.status}`
        let showItem = showDict[key]
        if (showItem === undefined) {
          showItem = {
            timestamp: timestamp,
            direction: item.direction,
            status: item.status,
            orders: [
              item
            ]
          }
          showDict[key] = showItem
        } else {
          showItem.orders.push(item)
        }
        showItem.orders.sort((a, b) => a.name - b.name)
      })

      const annotation = Object.keys(showDict).map(key => {
        let item = showDict[key]
        let amount = 0
        let vol = 0
        let texts = [`${item.direction} ${item.status}:`]
        item.orders.forEach(order => {
          if (order.status === '完成') {
            vol += order.price * order.amount
            amount += order.amount
          } else {
            vol += order.price
            amount += 1
          }
          texts.push(`${order.tm}: ${(order.amount*order.price).toFixed(1)} @${order.price} | ${order.name}`)
        })
        let price = vol / amount
        let color = item.direction === '买入' ? '#ef9a9a' : '#80cbc4'
        return {
          point: {
            timestamp: item.timestamp,
            value: price
          },
          styles:{
            offset: [0, 0],
            position: 'point', 
            symbol:{
              size:6, 
              type: item.status === '完成' ? 'circle' : 'triangle', 
              color: color,
              activeColor: color,
              activeSize: 8
            }
          },
          drawExtend: function ({ ctx, point, coordinate, viewport, isActive, styles }) {
            if (isActive) {
              const direction = item.direction === '买入' ? 1 : -1
              annotationDrawExtend(ctx, coordinate, texts, direction, color)
            }
          },
        }
      })
      Kline.createAnnotation(annotation, candlePane)
    }
    return () => {
      if (Kline) {
        Kline.removeAnnotation(candlePane) 
      }
    }
  }, [Kline, orders, showOrdersUpdate, level])

  useEffect(() => {
    if (symbol) {
      get_bottom_order('', '', symbol).then(
        res => setOrders(res)
      )
    }
  }, [symbol])

  useEffect(() => {
    let updateInterval = undefined
    if (Kline) {
      const levelTs = levelTsMap[level]
      const [start, end] = updateStartEnd(initKlineNum, level)
      const path = `/kline/${symbol}/${level}`
      if (history.location.pathname === '/kline') {
        history.replace(path)
      } else if (history.location.pathname !== path) {
        history.push(path)
      }
      load.loading()
      get_klines(symbol, level, start, end).then(
        res => {
          Kline.applyNewData(res)
          load.loaded()
        }
      )
      
      Kline.loadMore(ts => {
        ts = ts / 1000
        const start = ts - 1000 * levelTs
        load.loading()
        get_klines(symbol, level, start, ts).then(
          res => {
            Kline.applyMoreData(res)
            load.loaded()
          }
        )
      })
      updateInterval = setInterval(() => {
        const data = Kline.getDataList()
        const last_data = data[data.length-1]
        const start = last_data.timestamp / 1000
        const end = Math.floor(new Date() / 1000)
        get_klines(symbol, level, start, end).then(
          res => {
            res.forEach(item => {
              Kline.updateData(item)
              
            })
            if (end > start + levelTs) {
              setShowOrdersUpdate(end)
            }
          }
        )
      }, update_ts*1000)
      
    }
    return () => {
      if (updateInterval) {
        clearInterval(updateInterval)
      }
    }
  }, [Kline, level, symbol, history])

  useEffect(() => {
    const _Kline = init(domId)
    Object.keys(BollParams).forEach(name => {
      let template = generateBollTemplate(BollParams[name])
      _Kline.addTechnicalIndicatorTemplate(template)
      if (BollParams[name].show) {
        _Kline.createTechnicalIndicator(template, true, { id: candlePane })
      }
    })
    _Kline.createTechnicalIndicator('VOL')
    _Kline.setStyleOptions({
      candle: {
        tooltip: {
          labels:[
            '时间: ', '开: ', '收: ', '高: ',
            '低: ', '成交量: ', '成交额: ',
            '涨跌幅: ', '振幅: '
          ],
          showRule: 'follow_cross',
          showType: 'rect',
          rect: {
            offsetTop: 20
          },
          values: data => {
            return [
              moment(data.timestamp).format('YYYY-MM-DD HH:mm'), 
              data.open, data.close, data.high, data.low, 
              `${data.volume >= 1e9 ?
                  (data.volume / 1e9).toFixed(3)+'B' :
                  data.volume >= 1e6 ?
                    (data.volume / 1e6).toFixed(3)+'M' :
                    data.volume >= 1e3 ?
                      (data.volume / 1e3).toFixed(3)+'K' :
                      data.volume
              }`,
              `${data.turnover >= 1e9 ?
                  (data.turnover / 1e9).toFixed(3)+'B' :
                  data.turnover >= 1e6 ?
                    (data.turnover / 1e6).toFixed(3)+'M' :
                    data.turnover >= 1e3 ?
                      (data.turnover / 1e3).toFixed(3)+'K' :
                      data.turnover
              }`,
              {
                value: `${((data.close/data.open-1)*100).toFixed(2)}%`,
                color: data.close < data.open ? '#EF5350' : '#26A69A'
              },
              `${((data.high-data.low)/data.open*100).toFixed(2)}% (${((data.high/data.open-1)*100).toFixed(2)}%, ${((data.low/data.open-1)*100).toFixed(2)}%)`,
            ]
          },
          text: {size: 9}
        }
      },
      technicalIndicator: {
        tooltip: {
          text: {size: 9}
        }
      }
    })
    get_symbol_list().then(res => setSymbolList(res))
    get_bottom_order('', '', symbol).then(res => setOrders(res))
    setKline(_Kline)
    
    window.Kline = _Kline
    return () => {
      dispose(domId)
    }
  }, [])

  useEffect(() => {
    if (history.location.pathname.startsWith('/kline')) {
      const [, , newSymbol, newLevel] = history.location.pathname.split('/')
      if (newSymbol && newSymbol !== symbol) {
        setSymbol(newSymbol)
      }
      if (newLevel && newLevel !== level) {
        setLevel(newLevel)
      }
    }
  }, [history.location.pathname])
  
  return (<Layout className='kline-layout'>
    <Header className='kline-header'>
      <Row>
        <Col flex='50px'>
          <Button
            icon={<CaretLeftFilled />} size='small' type='text'
            onClick={() => history.goBack()}
          />
        </Col>
        <Col flex='120px'>
          <Select
            showSearch
            placeholder='输入或选择币种'
            size='small'
            value={symbol}
            onChange={onSymbolChange}
            filterOption={(input, option) => {
              return option.value.slice(0, -4).indexOf(input.toUpperCase()) >= 0
            }}
            filterSort={(optionA, optionB) =>
              optionA.value.toUpperCase().localeCompare(optionB.value.toUpperCase())
            }
            style={{width: 120}}
          >
            {Object.keys(symbolList).map((each, i) => {
              return <Select.Option
                key={i} value={each}
                style={{width: 120}}
              >
                {each.slice(0, -4) + '/USDT'}
              </Select.Option>
            })}
          </Select>
        </Col>
        <Col flex='auto'>
          <Select
            value={level}
            size='small'
            onChange={onLevelChange}
            style={{width: 120}}
          >
            {Object.keys(levelTsMap).map((each, i) => {
              return <Select.Option
                value={each} key={i} 
                style={{width: 120}}
              >
                {each}
              </Select.Option>
            })}
            
          </Select>
        </Col>
        <Col flex='50px'>
          <Setting Kline={Kline} params={BollParams} updateParams={updateBollParams}/>
        </Col>
      </Row>
  </Header>
  <Content>
  <div className='kline' id='kline' />
  </Content>
  </Layout>)
  
}

const Setting = ({Kline, params, updateParams}) => {
  const [configEditing, setConfigEditing] = React.useState(true)
  const onClickConfigEdit = () => {
    if (configEditing) {
      setConfigEditing(false)
    } else {
      setConfigEditing(true)
    }
  }
  return <Popover
    placement="bottomRight"
    content={<div>
      {
        Object.keys(params).map(name => {
          let param = params[name]
          return <Row key={param.key}>
            <Col><Checkbox
              checked={param.show}
              disabled={!configEditing}
              onChange={() => updateParams({[name]: {show: !param.show}})}
            >{name}</Checkbox></Col>
            <Col>
              参数: 
              <InputNumber
                size='small'
                value={param.params.calcParams[0]}
                disabled={!configEditing}
                onChange={newVal => {
                  param.params.calcParams[0] = newVal
                  updateParams({[name]: {params: { ...param.params }}})
                }}
              />
              <InputNumber
                size='small'
                value={param.params.calcParams[1].value}
                disabled={!configEditing}
                onChange={newVal => {
                  param.params.calcParams[1].value = newVal
                  updateParams({[name]: {params: { ...param.params }}})
                }}
              />
            </Col>
          </Row>
        })
      }
      <Row>
        <Button size='small' onClick={() => Kline.resize()}>
          重置尺寸
        </Button>
      </Row>
    </div>}
    trigger="click"
  >
    <Button size='small'>设置</Button>
  </Popover>
}

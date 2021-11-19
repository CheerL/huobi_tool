import React from 'react'
import HtmlReactParser from 'html-react-parser';
import marked from 'marked';
import { Toast } from 'antd-mobile'
import { Table, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  get_profit, get_stat, get_month_profit,
  get_currency_day_profit, get_record,
  get_bottom_day_profit, get_bottom_month_profit, get_bottom_order_profit, get_bottom_order, get_bottom_holding
} from './data'
import { useWindowDimensions } from './utils'

const Expand = ({ record, func, width }) => {
  const [text, setText] = React.useState('加载中')
  React.useEffect(() => {
    func(record, setText)
  }, [record, func])
  const outHtml = marked(text)
  // console.log(outHtml)
  return <div style={{width: width}}>{HtmlReactParser(outHtml)}</div>
}

const filterDropdown = () => {
  const dropdownIcon = filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
  const dropdownFunc = ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => <div style={{ padding: 8 }}>
    <Input
      placeholder='请输入'
      value={selectedKeys[0]}
      onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
      onPressEnter={() => confirm({ closeDropdown: true })}
      style={{ marginBottom: 8, display: 'block' }}
    />
    <Space>
      <Button
        type="primary"
        onClick={() => confirm({ closeDropdown: true })}
        size="small"
        style={{ width: 90 }}
      >
        筛选
      </Button>
      <Button onClick={() => clearFilters({ closeDropdown: true })} size="small" style={{ width: 90 }}>
        重置
      </Button>
    </Space>
  </div>
  return [dropdownIcon, dropdownFunc]
}

const compareFilterFunc = (key) => (value, record) => {
  try {
    const [, sign, _num] = /([><=]{0,2})(-?\d{0,2}\.?\d*)/.exec(value)
    const num = Number(_num)
    if (_num === '' || isNaN(num)) {
      Toast.fail('请输入 >、>=、<、<=、= 加上数字, 如 >10')
      return true
    }
    switch (sign) {
      case '>':
        return record[key] > num
      case '<':
        return record[key] < num
      case '>=':
        return record[key] >= num
      case '<=':
        return record[key] <= num
      case '=':
        return record[key] === num
      default:
        return record[key] === num
    }
  } catch {
    Toast.fail('请输入 >、>=、<、<=、= 加上数字, 如 >10')
    return true
  }

}

export const ProfitTable = () => {
  const {width: win_width, height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_profit('', '')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])
  const expandFunc = (record, setText) => {
    get_record(record.profit_id, '', '')
      .then(res => {
        const buy_main = res.filter(item => item.direction === 'buy')
          .map(item => {
            return `| ${item.currency} ` +
              `| ${item.time.slice(4)} ` +
              `| ${item.price.toPrecision(4)} ` +
              `| ${item.amount} ` +
              `| ${item.vol.toFixed(1)} |`
          }).join('\n')
        const sell_main = res.filter(item => item.direction === 'sell')
          .map(item => {
            return `| ${item.currency} ` +
              `| ${item.time.slice(4)} ` +
              `| ${item.price.toPrecision(4)} ` +
              `| ${item.amount} ` +
              `| ${item.vol.toFixed(1)} |`
          }).join('\n')
        setText('### 买入记录\n| 币种 | 时间 | 价格 | 成交量 | 成交额 |\n' +
          '| :----: | :----: | :----: | :----: | :----: |\n' +
          buy_main +
          '\n\n\n### 卖出记录\n| 币种 | 时间 | 价格 | 成交量 | 成交额 |\n' +
          '| :----: | :----: | :----: | :----: | :----: |\n' +
          sell_main
        )
      })
      .catch(err => {
        console.log(err)
        // throw err
      })

  }
  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const names = Array.from(new Set(data.map(item => item.name)))
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      filters: names.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '日期',
      width: 95,
      dataIndex: 'date',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.date.localeCompare(b.date),
      filterDropdown: dropdownFunc,
      onFilter: (value, record) => record.date.indexOf(value) > -1,
      filterIcon: dropdownIcon
    },
    {
      title: '收益',
      dataIndex: 'profit',
      width: 70,
      sorter: (a, b) => a.profit - b.profit,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}</span>
    },
    {
      title: '收益率',
      width: 70,
      dataIndex: 'percent',
      sorter: (a, b) => a.percent - b.percent,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(2)}%</span>
    }
  ]

  return <Table
    columns={columns} dataSource={data}
    tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} width={Math.max(350, win_width-50)}/>
    }}
    size='middle'
    pagination={{pageSize:50, simple: true}} scroll={{x: 350, y:win_height-100}}
  />
}

export const MonthProfitTable = () => {
  const {height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_month_profit('', '')
      .then(res => {
        const summary = {}
        res.map(item => {
          let month = item.month
          let cost = item.profit / item.percent * 100

          if (month in summary) {
            summary[month].profit += item.profit
            summary[month].fee += item.fee
            summary[month].cost += cost
          } else {
            summary[month] = {
              'profit': item.profit,
              'fee': item.fee,
              'cost': cost
            }
          }
          return null
        })
        for (const month in summary) {
          let item = summary[month]
          res = res.concat({
            'fee': item.fee,
            'profit': item.profit,
            'key': res.length + 1,
            'month': month,
            'name': '总计',
            'percent': item.profit / item.cost * 100
          })
        }
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])

  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const names = Array.from(new Set(data.map(item => item.name)))
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      filters: names.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.name === value,
      render: text => text === '总计' ? <span style={{color:'red'}}>总计</span> : text
    },
    {
      title: '月份',
      width: 80,
      dataIndex: 'month',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.month.localeCompare(b.month),
      filterDropdown: dropdownFunc,
      onFilter: (value, record) => record.month.indexOf(value) > -1,
      filterIcon: dropdownIcon
    },
    {
      title: '收益',
      dataIndex: 'profit',
      width: 70,
      sorter: (a, b) => a.profit - b.profit,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}</span>
    },
    {
      title: '收益率',
      width: 70,
      dataIndex: 'percent',
      sorter: (a, b) => a.percent - b.percent,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}%</span>
    },
    {
      title: '手续费',
      width: 70,
      dataIndex: 'fee',
      sorter: (a, b) => a.fee - b.fee,
      render: text => `${Number(text).toFixed(1)}`
    }
  ]

  return <Table columns={columns} dataSource={data} tableLayout='fixed'
  size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 350, y:win_height-100}}
  />
}

export const CurrencyDayTable = () => {
  const {width: win_width, height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_currency_day_profit('', '')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])
  const expandFunc = (record, setText) => {
    get_record('', record.currency, record.date)
      .then(res => {
        const table_main = res.map(item => (
          `| ${item.name.indexOf('小号') > -1 ? '夜空中...欣(小号)' : item.name} ` +
          `| ${item.time.slice(4)} ` +
          `| ${item.price.toPrecision(4)} ` +
          `| ${item.vol.toFixed(1)} ` +
          `| ${item.direction === 'buy' ? '买' : '卖'} |`)
        ).join('\n')
        setText('### 明细\n| 姓名 | 时间 | 价格 | 成交额 | 方向 |\n' +
          '| :----: | :----: | :----: | :----: | :----: |\n' +
          table_main
        )
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }
  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const currencies = Array.from(new Set(data.map(item => item.currency))).sort()
  const columns = [
    {
      title: '币种',
      dataIndex: 'currency',
      filters: currencies.map(item => ({
        'text': item,
        'value': item
      })),
      onFilter: (value, record) => record.currency === value,
      fixed: 'left'
    },
    {
      title: '日期',
      width: 95,
      dataIndex: 'date',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.date.localeCompare(b.date),
      onFilter: (value, record) => record.date.indexOf(value) > -1,
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '状态',
      width: 70,
      dataIndex: 'type',
      render: text => {
        switch (text) {
          case 1: return <span className='type-high-profit'>止盈</span>
          case 2: return <span className='type-high-loss'>止损</span>
          default: return '正常'
        }
      },
      filters: [
        { 'text': '正常', 'value': 0 },
        { 'text': '止盈', 'value': 1 },
        { 'text': '止损', 'value': 2 }
      ],
      onFilter: (value, record) => record.type === value
    },
    {
      title: '收益',
      width: 70,
      dataIndex: 'profit',
      sorter: (a, b) => a.profit - b.profit,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}</span>
    },
    {
      title: '收益率',
      width: 90,
      dataIndex: 'percent',
      sorter: (a, b) => a.percent - b.percent,
      onFilter: compareFilterFunc('percent'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}%</span>
    },
    {
      title: '买入额',
      width: 70,
      dataIndex: 'buy',
      render: text => `${text.toFixed(1)}`
    },
    {
      title: '卖出额',
      width: 70,
      dataIndex: 'sell',
      render: text => `${text.toFixed(1)}`
    },
    
    {
      title: '买入时间',
      width: 80,
      dataIndex: 'buy_tm',
      render: text => `00:${text < 10 ? '0' : ''}${text.toFixed(3)}`
    },
    {
      title: '卖出时间',
      width: 80,
      dataIndex: 'sell_tm',
      render: text => `00:${text < 10 ? '0' : ''}${text.toFixed(3)}`
    },
    {
      title: '持有时长',
      width: 110,
      dataIndex: 'hold_tm',
      render: text => `${text.toFixed(3)}`,
      sorter: (a, b) => a.percent - b.percent,
      onFilter: compareFilterFunc('hold_tm'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
  ]

  return <Table
    columns={columns} dataSource={data} tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} width={Math.max(350, win_width-50)} />
    }}
    size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 830, y:win_height-100}}
  />
}

export const CurrencyStatTable = () => {
  const {width: win_width, height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_stat()
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])

  const expandFunc = (record, setText) => {
    get_currency_day_profit(record.currency, '')
      .then(res => {
        const table_main = res.map(item => (
          `| ${item.currency} ` +
          `| ${item.date} ` +
          `|${item.type === 0 ?
            '正常' :
            (item.type === 1 ?
              '<span class="type-high-profit">止盈</span>' :
              '<span class="type-high-loss">止损</span>'
            )} ` +
          `| ${item.percent.toFixed(2)}% ` +
          `| ${item.buy.toFixed(1)} ` +
          `| ${item.sell.toFixed(1)} ` +
          `| ${(item.sell - item.buy).toFixed(1)} ` +
          `| 00:${item.buy_tm < 10 ? '0' : ''}${item.buy_tm.toFixed(3)} ` +
          `| 00:${item.sell_tm < 10 ? '0' : ''}${item.sell_tm.toFixed(3)} ` +
          `| ${(item.sell_tm - item.buy_tm).toFixed(3)} |`)
        ).join('\n')
        setText('### 明细\n| 币种 | 日期 | 状态 | 收益率 | 买入额 | 卖出额 | 收益 | 买入时间 | 卖出时间 | 持有时长 | \n' +
          '| :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----:| :----: | :----: |\n' +
          table_main)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }
  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const currencies = Array.from(new Set(data.map(item => item.currency))).sort()
  const columns = [
    {
      title: '币种',
      dataIndex: 'currency',
      filters: currencies.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.currency === value,
      // fixed: 'left'
    },
    {
      title: '买入次数',
      width: 80,
      dataIndex: 'buy_times',
      sorter: (a, b) => a.buy_times > b.buy_times,
      onFilter: compareFilterFunc('buy_times'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '盈利次数',
      width: 80,
      dataIndex: 'profit_times',
      sorter: (a, b) => a.profit_times > b.profit_times,
      onFilter: compareFilterFunc('profit_times'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '止盈次数',
      width: 80,
      dataIndex: 'high_profit_times',
      sorter: (a, b) => a.high_profit_times > b.high_profit_times,
      onFilter: compareFilterFunc('high_profit_times'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '止损次数',
      width: 80,
      dataIndex: 'high_loss_times',
      sorter: (a, b) => a.high_loss_times > b.high_loss_times,
      onFilter: compareFilterFunc('high_loss_times'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '总收益',
      dataIndex: 'total_profit',
      width: 70,
      sorter: (a, b) => a.total_profit - b.total_profit,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}</span>
    },
    {
      title: '总收益率',
      width: 80,
      dataIndex: 'total_percent',
      sorter: (a, b) => a.total_percent - b.total_percent,
      onFilter: compareFilterFunc('total_percent'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}%</span>
    },
    {
      title: '盈利率',
      width: 90,
      dataIndex: 'profit_percent',
      sorter: (a, b) => a.profit_percent - b.profit_percent,
      render: text => `${text.toFixed(1)}%`,
      onFilter: compareFilterFunc('profit_percent'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '止盈率',
      width: 90,
      dataIndex: 'high_profit_percent',
      sorter: (a, b) => a.high_profit_percent - b.high_profit_percent,
      render: text => `${text.toFixed(1)}%`,
      onFilter: compareFilterFunc('high_profit_percent'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '止损率',
      width: 90,
      dataIndex: 'high_loss_percent',
      sorter: (a, b) => a.high_loss_percent - b.high_loss_percent,
      render: text => `${text.toFixed(1)}%`,
      onFilter: compareFilterFunc('high_loss_percent'),
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    }
  ]

  return <Table
    columns={columns} dataSource={data}
    tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} width={Math.max(650, win_width-50)}/>
    }}
    size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 840, y:win_height-100}}
  />
}


export const BottomProfitTable = () => {
  const {width: win_width, height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_bottom_day_profit('', '')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])
  const expandFunc = (record, setText) => {
    get_bottom_order_profit(record.name, record.date, '')
      .then(res => {
        const sell_main = res
          .map(item => {
            const color=item.profit > 0 ? 'red' : 'green'
            return `| ${item.symbol} ` +
              `| ${item.sell_tm} ` +
              `| ${item.sell_price.toPrecision(4)} ` +
              `| ${item.buy_price.toPrecision(4)}` +
              `| <span style="color:${color}">${item.profit.toFixed(1)}</span> ` +
              `| <span style="color:${color}">${(Number(item.profit_rate)*100).toFixed(2)}%</span> ` +
              `| ${item.sell_amount} ` +
              `| ${item.sell_vol.toFixed(1)} ` +
              `| ${item.fee.toFixed(1)} |`
          }).join('\n')
        setText('| 币种 | 卖出时间 | 卖出价格 | 买入价格 | 收益 | 收益率 | 卖出量 | 卖出额 | 手续费 |\n' +
          '| :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |\n' +
          sell_main
        )
      })
      .catch(err => {
        console.log(err)
        // throw err
      })

  }
  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const names = Array.from(new Set(data.map(item => item.name)))
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      filters: names.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '日期',
      width: 95,
      dataIndex: 'date',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.date.localeCompare(b.date),
      filterDropdown: dropdownFunc,
      onFilter: (value, record) => record.date.indexOf(value) > -1,
      filterIcon: dropdownIcon
    },
    {
      title: '收益',
      dataIndex: 'profit',
      width: 70,
      sorter: (a, b) => a.profit - b.profit,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}</span>
    },
    {
      title: '收益率',
      width: 70,
      dataIndex: 'profit_rate',
      sorter: (a, b) => a.profit_rate - b.profit_rate,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{(text*100).toFixed(2)}%</span>
    }
  ]

  return <Table
    columns={columns} dataSource={data}
    tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} width={Math.max(700, win_width-50)}/>
    }}
    size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 350, y:win_height-100}}
  />
}

export const BottomMonthProfitTable = () => {
  const {height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_bottom_month_profit('', '')  
      .then(res => {
        const summary = {}
        res.map(item => {
          let month = item.month
          let cost = item.profit / item.profit_rate

          if (month in summary) {
            summary[month].profit += item.profit
            summary[month].fee += item.fee
            summary[month].cost += cost
          } else {
            summary[month] = {
              'profit': item.profit,
              'fee': item.fee,
              'cost': cost
            }
          }
          return null
        })
        for (const month in summary) {
          let item = summary[month]
          res = res.concat({
            'fee': item.fee,
            'profit': item.profit,
            'key': res.length + 1,
            'month': month,
            'name': '总计',
            'profit_rate': item.profit / item.cost
          })
        }
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])

  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const names = Array.from(new Set(data.map(item => item.name)))
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      filters: names.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.name === value,
      render: text => text === '总计' ? <span style={{color:'red'}}>总计</span> : text
    },
    {
      title: '月份',
      width: 80,
      dataIndex: 'month',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.month.localeCompare(b.month),
      filterDropdown: dropdownFunc,
      onFilter: (value, record) => record.month.indexOf(value) > -1,
      filterIcon: dropdownIcon
    },
    {
      title: '收益',
      dataIndex: 'profit',
      width: 70,
      sorter: (a, b) => a.profit - b.profit,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{text.toFixed(1)}</span>
    },
    {
      title: '收益率',
      width: 70,
      dataIndex: 'profit_rate',
      sorter: (a, b) => a.profit_rate - b.profit_rate,
      render: text => <span style={{color:text > 0 ? 'red':'green'}}>{(text*100).toFixed(2)}%</span>

    },
    {
      title: '手续费',
      width: 70,
      dataIndex: 'fee',
      sorter: (a, b) => a.fee - b.fee,
      render: text => `${text.toFixed(1)}`
    }
  ]

  return <Table columns={columns} dataSource={data} tableLayout='fixed'
  size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 350, y:win_height-100}}
  />
}

export const BottomOrderTable = () => {
  const {width: win_width, height: win_height} = useWindowDimensions()
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_bottom_order('', '', '')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])
  const expandFunc = (item, setText) => {
    setText('| 币种 | 订单编号 | 交易时间 | 价格 | 交易量 | 交易额 | 手续费 | 方向 | 状态 |\n' +
          '| :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |\n' +
          `| ${item.symbol} ` +
          `| ${item.order_id} ` +
          `| ${item.tm} ` +
          `| ${item.price.toPrecision(4)} ` +
          `| ${item.amount} ` +
          `| ${item.vol.toFixed(1)} ` +
          `| ${item.fee.toFixed(1)} ` +
          `| ${item.direction} ` +
          `| ${item.status} |` 
        )

  }
  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const names = Array.from(new Set(data.map(item => item.name)))
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      filters: names.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '日期',
      width: 95,
      dataIndex: 'date',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.date.localeCompare(b.date),
      filterDropdown: dropdownFunc,
      onFilter: (value, record) => record.date.indexOf(value) > -1,
      filterIcon: dropdownIcon
    },
    {
      title: '币种',
      dataIndex: 'symbol',
      width: 60,
      sorter: (a, b) => a.symbol.localeCompare(b.symbol),
      render: text => `${text.slice(0,-4)}`
    },
    {
      title: '方向',
      width: 55,
      dataIndex: 'direction',
      sorter: (a, b) => a.direction.localeCompare(b.direction),
      // render: text => `${(Number(text)*100).toFixed(2)}%`
      render: text => {
        switch (text) {
          case '买入': return <span className='type-high-profit'>买入</span>
          default: return <span className='type-high-loss'>卖出</span>
        }
      },
    },
    {
      title: '金额',
      width: 55,
      dataIndex: 'vol',
      sorter: (a, b) => a.vol - b.vol,
      render: text => `${text.toFixed(0)}`
    }
  ]

  return <Table
    columns={columns} dataSource={data}
    tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} width={Math.max(650, win_width-50)}/>
    }}
    size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 360, y:win_height-100}}
  />
}

export const BottomHoldingTable = () => {
  const {width: win_width, height: win_height} = useWindowDimensions()
  const [detail, setDetail] = React.useState([])
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_bottom_holding('', '', '')
      .then(res => {
        setDetail(res)
        const summary = {}
        res.map(item => {
          let name = item.name

          if (name in summary) {
            summary[name].vol += item.vol
            summary[name].buy_vol += item.buy_vol
          } else {
            summary[name] = {
              'vol': item.vol,
              'buy_vol': item.buy_vol,
            }
          }
          return null
        })
        const data = []
        for (const name in summary) {
          let item = summary[name]
          data.push({
            'key': data.length,
            'name': name,
            'vol': item.vol,
            'buy_vol': item.buy_vol,
            'profit': item.vol - item.buy_vol,
            'profit_rate': item.vol / item.buy_vol - 1
          })
        }
        setData(data)
      })
      .catch(err => {
        console.log(err)
        // throw err
      })
  }, [])
  const expandFunc = (user, setText) => {
    const holding = detail.filter(item => item.name === user.name)
          .map(item => {
            const color = item.profit > 0 ? "type-high-profit" : "type-high-loss"
            return `| ${item.symbol} ` +
              `| ${item.price.toPrecision(4)} ` +
              `| ${item.buy_price.toPrecision(4)} ` +
              `|<span class=${color}>${item.profit.toFixed(2)}</span>`+
              `|<span class=${color}>${(Number(item.profit_rate)*100).toFixed(2)}%</span>` +
              `| ${item.vol.toFixed(1)} ` +
              `| ${item.buy_vol.toFixed(1)} ` +
              `| ${item.amount.toPrecision(6)} |`
          }).join('\n')
    setText(
      '| 币种 | 当前价 | 买入价 | 浮盈 | 浮盈率 | 当前金额 | 买入金额 | 数量 |\n' +
      '| :----: | :----: | :----: | :----: | :----: | :----: | :----: | :----: |\n'
      + holding
    )
  }

  const names = Array.from(new Set(data.map(item => item.name)))
  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      filters: names.map(item => ({
        'text': item,
        'value': item
      })),
      fixed: true,
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '资产',
      dataIndex: 'vol',
      width: 60,
      sorter: (a, b) => a.vol - b.vol,
      render: text => `${text.toFixed(0)}`
    },
    {
      title: '成本',
      dataIndex: 'buy_vol',
      width: 60,
      sorter: (a, b) => a.buy_vol - b.buy_vol,
      render: text => `${text.toFixed(0)}`
    },
    {
      title: '浮盈',
      dataIndex: 'profit',
      width: 60,
      sorter: (a, b) => a.profit - b.profit,
      render: text => {
        if (Number(text) > 0) {
          return <span className='type-high-profit'>{text.toFixed(1)}</span>
        } else {
          return <span className='type-high-loss'>{text.toFixed(1)}</span>
        }
      }
    },
    {
      title: '浮盈率',
      width: 65,
      dataIndex: 'profit_rate',
      render: text => {
        if (Number(text) > 0) {
          return <span className='type-high-profit'>{(Number(text)*100).toFixed(2)}%</span>
        } else {
          return <span className='type-high-loss'>{(Number(text)*100).toFixed(2)}%</span>
        }
      }
    }
  ]

  return <Table
    columns={columns} dataSource={data}
    tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} width={Math.max(550, win_width-50)}/>
    }}
    size='middle' pagination={{pageSize:50, simple: true}} scroll={{x: 350, y:win_height-100}}
  />
}
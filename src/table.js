import React from 'react'
import ReactHtmlParser from 'react-html-parser';
import marked from 'marked';
import { Table, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  get_profit, get_message, get_month_profit,
  get_currency_day_profit, get_record
} from './data'

const Expand = ({ record, func }) => {
  const [text, setText] = React.useState('加载中')
  React.useEffect(() => {
    func(record, text, setText)
  }, [record, func])
  const outHtml = marked(text)
  return ReactHtmlParser(outHtml)
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

export const ProfitTable = () => {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_profit('', '')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        throw err
      })
  }, [])
  const expandFunc = (record, text, setText) => {
    get_message(record.name, record.date, record.profit)
      .then(res => {
        setText(res)
      })
      .catch(err => {
        console.log(err)
        throw err
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
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '日期',
      width: 105,
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
      width: 80,
      sorter: (a, b) => a.profit - b.profit,
      render: text => `${text.toFixed(2)}`
    },
    {
      title: '收益率',
      width: 86,
      dataIndex: 'percent',
      sorter: (a, b) => a.percent - b.percent,
      render: text => `${text.toFixed(2)}%`
    }
  ]

  return <Table
    columns={columns} dataSource={data}
    tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} />
    }}
  />
}

export const MonthProfitTable = () => {
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
        throw err
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
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '月份',
      width: 85,
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
      width: 80,
      sorter: (a, b) => a.profit - b.profit,
      render: text => `${text.toFixed(1)}`
    },
    {
      title: '收益率',
      width: 75,
      dataIndex: 'percent',
      sorter: (a, b) => a.percent - b.percent,
      render: text => `${text.toFixed(1)}%`
    },
    {
      title: '手续费',
      width: 80,
      dataIndex: 'fee',
      sorter: (a, b) => a.fee - b.fee,
      render: text => `${Number(text).toFixed(2)}`
    }
  ]

  return <Table columns={columns} dataSource={data} tableLayout='fixed' />
}

export const CurrencyDayTable = () => {
  const [data, setData] = React.useState([])
  React.useEffect(() => {
    get_currency_day_profit('', '')
      .then(res => {
        setData(res)
      })
      .catch(err => {
        console.log(err)
        throw err
      })
  }, [])
  const expandFunc = (record, text, setText) => {
    get_record(record.currency, record.day)
      .then(res => {
        const table_main = res.map(item => `| ${item.name.indexOf('小号') > -1 ? '夜空中...欣(小号)' : item.name} | ${item.time.slice(4)} | ${item.price.toPrecision(4)} | ${item.vol.toFixed(1)} | ${item.direction==='buy' ? '买' : '卖'} |`).join('\n')
        setText('### 明细\n| 姓名 | 时间 | 价格 | 成交额 | 方向 |\n'+
          '| :----: | :----: | :----: | :----: | :----: |\n'+
          table_main+'\n\n### 总计\n'+
          '| 总买入 | 总卖出 | 总收益 |\n'+
          '| :----: | :----: | :----: |\n'+
          `| ${record.buy} | ${record.sell} | ${(record.sell-record.buy).toFixed(1)} |`
        )
      })
      .catch(err => {
        console.log(err)
        throw err
      })
    
  }
  const [dropdownIcon, dropdownFunc] = filterDropdown()
  const [dropdownIcon2, dropdownFunc2] = filterDropdown()
  const currencies = Array.from(new Set(data.map(item => item.currency)))
  const columns = [
    {
      title: '币种',
      dataIndex: 'currency',
      filters: currencies.map(item => ({
        'text': item,
        'value': item
      })),
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '日期',
      width: 120,
      dataIndex: 'day',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.day.localeCompare(b.day),
      onFilter: (value, record) => record.day.indexOf(value) > -1,
      filterDropdown: dropdownFunc,
      filterIcon: dropdownIcon
    },
    {
      title: '收益率',
      width: 110,
      dataIndex: 'percent',
      sorter: (a, b) => a.percent - b.percent,
      render: text => `${text.toFixed(1)}%`,
      onFilter: (value, record) => {
        const [_str, sign, _num] = /([><=]{1,2})(-?\d{1,2}\.?\d*)%?/.exec(value)
        const num = Number(_num)
        if (_num === '' || isNaN(num)) {
          return true
        }
        switch (sign) {
          case '>':
            return record.percent > num
          case '<':
            return record.percent < num
          case '>=':
            return record.percent >= num
          case '<=':
            return record.percent <= num
          case '=':
            return record.percent === num
          default:
            return true
        }
      },
      filterDropdown: dropdownFunc2,
      filterIcon: dropdownIcon2
    }
  ]

  return <Table
    columns={columns} dataSource={data} tableLayout='fixed'
    expandable={{
      columnWidth: 25,
      expandedRowRender: record => <Expand record={record} func={expandFunc} />
    }}
    />
}
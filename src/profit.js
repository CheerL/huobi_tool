import React from 'react'
import ReactMarkdown from 'react-markdown'
import gfm from 'remark-gfm'
import { Table, Button, Space, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { get_profit, get_message } from './data'

const Expand = ({ record }) => {
  const [text, setText] = React.useState('加载中')
  React.useEffect(() => {
    get_message(record.name, record.date, record.profit)
      .then(res => {
        setText(res)
      })
      .catch(err => {
        console.log(err)
        throw err
      })
  }, [])
  return <ReactMarkdown
    // remarkPlugins={[gfm]}
    children={text}
  />
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

  const dateFilter = ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => {
    return <div style={{ padding: 8 }}>
      <Input
        placeholder='输入日期或月份'
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
      // ellipsis: true,
      onFilter: (value, record) => record.name === value,
    },
    {
      title: '日期',
      width: 105,
      dataIndex: 'date',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.date.localeCompare(b.date),
      filterDropdown: dateFilter,
      onFilter: (value, record) => record.date.indexOf(value) > -1,
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
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
      expandedRowRender: record => <Expand record={record} />
    }}
  />
}
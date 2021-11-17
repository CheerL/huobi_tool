import './App.css';
import React from 'react'
import { BrowserRouter as Router, Switch, Route, useHistory } from "react-router-dom";
import { PriceChart } from './chart';
import { 
  ProfitTable, MonthProfitTable, CurrencyDayTable, CurrencyStatTable,
  BottomProfitTable, BottomMonthProfitTable, BottomOrderTable
} from './table'
import { Space } from 'antd'
import { Button, Tabs } from 'antd-mobile'

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path='/bottom/order'>
            <BottomOrderTable />
          </Route>
          <Route path='/bottom/profit'>
            <BottomProfitTable />
          </Route>
          <Route path='/bottom/month_profit'>
            <BottomMonthProfitTable />
          </Route>
          <Route path='/month_profit'>
            <MonthProfitTable />
          </Route>
          <Route path='/profit'>
            <ProfitTable />
          </Route>
          <Route path='/price'>
            <PriceChart />
          </Route>
          <Route path='/currency_day'>
            <CurrencyDayTable />
          </Route>
          <Route path='/stat'>
            <CurrencyStatTable />
          </Route>
          <Route path='/bottom'>
            <Index />
          </Route>
          <Route path='/'>
            <Index />
          </Route>
        </Switch>

      </div>
    </Router>
  );
}

const Index = () => {
  const history = useHistory()
  const tabs = [
    {title: '凌晨策略'},
    {title: '抄底策略'},
  ]
  const onChange = (tab, index) => {
    console.log(tab, index)
    if (index === 0) {
      history.push('/')
    } else {
      history.push('/bottom')
    }
  }
  // console.log(history)
  return <Tabs tabs={tabs} onChange={onChange} initialPage={history.location.pathname === '/' ? 0 : 1}>
    <MorningIndex />
    <BottomIndex />
  </Tabs>
}

const MorningIndex = () => {
  const history = useHistory()
  // console.log(history)
  return <Space direction="vertical" className='index-space-box' size={15}>
    {/* <Button onClick={() => history.push('/bottom')}><span className='type-high-profit'>抄底策略数据</span></Button> */}
    <Button onClick={() => history.push('/month_profit')}>月收益表</Button>
    <Button onClick={() => history.push('/profit')}>收益表</Button>
    <Button onClick={() => history.push('/currency_day')}>币种单日收益表</Button>
    <Button onClick={() => history.push('/stat')}>币种统计表</Button>
    <Button onClick={() => history.push('/price')}>价格图</Button>
  </Space>
}

const BottomIndex = () => {
  const history = useHistory()
  return <Space direction="vertical" className='index-space-box' size={15}>
    <Button onClick={() => history.push('/bottom/month_profit')}>月收益表</Button>
    <Button onClick={() => history.push('/bottom/profit')}>收益表</Button>
    <Button onClick={() => history.push('/bottom/order')}>交易记录</Button>
    {/* <Button onClick={() => history.push('/bottom/holding')}>用户当前持有</Button> */}
  </Space>
}

export default App;

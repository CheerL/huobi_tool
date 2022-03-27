import './App.css';
import React from 'react'
import { BrowserRouter as Router, Switch, Route, useHistory } from "react-router-dom";
import { PriceChart } from './chart';
import { 
  ProfitTable, MonthProfitTable, CurrencyDayTable, CurrencyStatTable,
  BottomProfitTable, BottomMonthProfitTable, BottomOrderTable, BottomHoldingTable
} from './table'
import { KLineChart } from './kline'
import { Space } from 'antd'
import { Button, Tabs } from 'antd-mobile'
import { Redirect } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path='/kline/:symbol/:level'>
            <KLineChart />
          </Route>
          <Route path='/kline'>
            <Redirect to='/kline/BTCUSDT/1min'/>
          </Route>
          <Route path='/bottom/holding'>
            <BottomHoldingTable />
          </Route>
          <Route path='/bottom/order'>
            <BottomOrderTable />
          </Route>
          <Route path='/bottom/profit'>
            <BottomProfitTable />
          </Route>
          <Route path='/bottom/month_profit'>
            <BottomMonthProfitTable />
          </Route>
          <Route path='/morning/month_profit'>
            <MonthProfitTable />
          </Route>
          <Route path='/morning/profit'>
            <ProfitTable />
          </Route>
          <Route path='/morning/price'>
            <PriceChart />
          </Route>
          <Route path='/morning/currency_day'>
            <CurrencyDayTable />
          </Route>
          <Route path='/morning/stat'>
            <CurrencyStatTable />
          </Route>
          <Route path='/bottom'>
            <Index />
          </Route>
          <Route path='/morning'>
            <Index />
          </Route>
          <Route path='/'>
            <Redirect to='/bottom'/>
          </Route>
        </Switch>

      </div>
    </Router>
  );
}

const Index = () => {
  const history = useHistory()
  const tabs = [
    {title: '抄底策略'},
    {title: '凌晨策略'},
  ]
  const onChange = (tab, index) => {
    if (index === 0) {
      history.push('/bottom')
    } else {
      history.push('/morning')
    }
  }
  // console.log(history)
  return <Tabs tabs={tabs} onChange={onChange} initialPage={history.location.pathname === '/bottom' ? 0 : 1}>
    <BottomIndex />
    <MorningIndex />
  </Tabs>
}

const MorningIndex = () => {
  const history = useHistory()
  // console.log(history)
  return <Space direction="vertical" className='index-space-box' size={15}>
    {/* <Button onClick={() => history.push('/bottom')}><span className='type-high-profit'>抄底策略数据</span></Button> */}
    <Button onClick={() => history.push('/morning/month_profit')}>月收益表</Button>
    <Button onClick={() => history.push('/morning/profit')}>收益表</Button>
    <Button onClick={() => history.push('/morning/currency_day')}>币种单日收益表</Button>
    <Button onClick={() => history.push('/morning/stat')}>币种统计表</Button>
    <Button onClick={() => history.push('/morning/price')}>价格图</Button>
  </Space>
}

const BottomIndex = () => {
  const history = useHistory()
  return <Space direction="vertical" className='index-space-box' size={15}>
    <Button onClick={() => history.push('/bottom/month_profit')}>月收益表</Button>
    <Button onClick={() => history.push('/bottom/profit')}>收益表</Button>
    <Button onClick={() => history.push('/bottom/order')}>交易记录</Button>
    <Button onClick={() => history.push('/bottom/holding')}>用户当前持有</Button>
    <Button onClick={() => history.push('/kline')}>K线图</Button>
  </Space>
}

export default App;

import './App.css';
import { BrowserRouter as Router, Switch, Route, useHistory } from "react-router-dom";
import { PriceChart } from './chart';
import { ProfitTable, MonthProfitTable, CurrencyDayTable, CurrencyStatTable } from './table'
import { Button, WingBlank, WhiteSpace } from 'antd-mobile'

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
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
  return <WingBlank>
    <WhiteSpace />
    <Button onClick={() => history.push('/month_profit')}>月收益表</Button>
    <WhiteSpace />
    <Button onClick={() => history.push('/profit')}>收益表</Button>
    <WhiteSpace />
    <Button onClick={() => history.push('/currency_day')}>币种单日收益表</Button>
    <WhiteSpace />
    <Button onClick={() => history.push('/stat')}>币种统计表</Button>
    <WhiteSpace />
    <Button onClick={() => history.push('/price')}>价格图</Button>
  </WingBlank>
}

export default App;

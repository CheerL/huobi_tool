import './App.css';
import { BrowserRouter as Router, Switch, Route, useHistory } from "react-router-dom";
import { PriceChart } from './chart';
import { ProfitTable } from './profit'
import { Button, WingBlank, WhiteSpace } from 'antd-mobile'

function App() {
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path='/profit'>
            <ProfitTable />
          </Route>
          <Route path='/price'>
            <PriceChart />
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
    <Button onClick={() => history.push('/profit')}>收益表</Button>
    <WhiteSpace />
    <Button onClick={() => history.push('/price')}>价格图</Button>
  </WingBlank>
}

export default App;

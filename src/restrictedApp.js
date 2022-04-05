import './App.css';
import React from 'react'
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { BottomProfitTable, BottomMonthProfitTable } from './table'
import { get_users } from './data'
import md5 from 'js-md5';

function RestrictedApp() {
  const [user, setUser] = React.useState('')

  React.useEffect(() => {
    const params = window.location.pathname.split('/')
    const enc_user = decodeURI(params[params.length - 1])
    if (enc_user) {
      // get_users().then(res => {
      //   res.forEach(each => {
      //     if (md5(each.name) === enc_user || each.name === enc_user) {
      //       setUser(each.name)
      //     }
      //   })
      // })
      get_users().then(res => {
        for (const each of res) {
          if (md5(each.name) === enc_user || each.name === enc_user) {
            setUser(each.name)
            break
          }
        }
      })
    }
  }, [])
  return (
    <Router>
      <div className="App">
        <Switch>
          <Route path='/bottom/profit/:user'>
            {user ? <BottomProfitTable user={user} /> : <NoMatch /> }
          </Route>
          <Route path='/bottom/month_profit/:user'>
            {user ? <BottomMonthProfitTable user={user}/> : <NoMatch /> }
          </Route>
          <Route path='/'>
            <NoMatch />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

const NoMatch = () => (
  <div><h3>无法访问</h3></div>
)

export default RestrictedApp;

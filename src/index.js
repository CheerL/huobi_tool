import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import RestrictedApp from './restrictedApp';
import zhCN from 'antd/lib/locale/zh_CN';
import { ConfigProvider } from 'antd';
// import reportWebVitals from './reportWebVitals'

ReactDOM.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      { window.restricted ? <RestrictedApp /> : <App /> }
    </ConfigProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log)
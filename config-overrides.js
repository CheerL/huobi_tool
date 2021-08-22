const { override, fixBabelImports } = require('customize-cra');
// const { injectBabelPlugin } = require('react-app-rewired');


// module.exports = function override(config, env) {
//     config = injectBabelPlugin(
//         ['import', { libraryName: 'antd', libraryDirectory: 'es', style: 'css' }, "ant"],
//         config,
//     );
//     config = injectBabelPlugin(
//         ['import', { libraryName: 'antd-mobile', libraryDirectory: 'es', style: 'css' }, "antd-mobile"],
//         config,
//     );
//     return config;
//   };
module.exports = override(
  fixBabelImports('antd-mobile', {
    libraryName: 'antd-mobile',
    style: 'css',
  }),
  fixBabelImports('antd', {
    libraryName: 'antd',
    libraryDirectory: 'es',
    style: 'css',
  })
);
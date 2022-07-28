const appPaths = require('react-scripts/config/paths');
const { deleteUseItem, firstRule, firstUseItem, replaceUseItem } = require('wuzzle');

module.exports = {
  modify(webpackConfig, webpack, wuzzleContext) {
    const { commandArgs } = wuzzleContext;

    if (commandArgs[0] === 'start' || commandArgs[0] === 'build') {
      // Replace sass-loader with less-loader to support .less files
      const lessOptions = {
        javascriptEnabled: true,
        modifyVars: { '@primary-color': '#1da57a' },
      };

      const scssRuleQuery = { file: { dir: appPaths.appSrc, base: 'index.scss' } };
      const lessRule = firstRule(webpackConfig, scssRuleQuery);
      Object.assign(lessRule, { test: /\.(less)$/, exclude: /\.module\.less$/ });
      deleteUseItem(lessRule, { loader: 'resolve-url-loader' });
      replaceUseItem(
        lessRule,
        { loader: 'sass-loader' },
        { loader: 'less-loader', options: { sourceMap: true, lessOptions } }
      );
      firstUseItem(lessRule, { loader: 'css-loader' }).options.importLoaders = 2;

      const scssModuleRuleQuery = { file: { dir: appPaths.appSrc, base: 'index.module.scss' } };

      const lessModuleRule = firstRule(webpackConfig, scssModuleRuleQuery);
      Object.assign(lessModuleRule, { test: /\.module\.less$/ });
      deleteUseItem(lessModuleRule, { loader: 'resolve-url-loader' });
      replaceUseItem(
        lessModuleRule,
        { loader: 'sass-loader' },
        { loader: 'less-loader', options: { sourceMap: true, lessOptions } }
      );
      firstUseItem(lessModuleRule, { loader: 'css-loader' }).options.importLoaders = 2;
    }

    if (commandArgs[0] === 'test') {
      const cssRule = firstRule(webpackConfig, { file: 'index.css' });
      cssRule.test = [cssRule.test, /\.less$/];

      const fallbackRule = firstRule(webpackConfig, { file: 'index.fallback' });
      fallbackRule.exclude.push(/\.less$/);
    }
  },

  jest(jestConfig, jestInfo, wuzzleContext) {
    for (const transformItem of jestConfig.transform) {
      const fileRegExp = new RegExp(transformItem[0]);
      if (fileRegExp.test('index.css')) {
        transformItem[0] = '^.+\\.(css|less)$';
      }
      if (fileRegExp.test('index.fallback')) {
        transformItem[0] = '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|less|json)$)';
      }
    }
  },
};

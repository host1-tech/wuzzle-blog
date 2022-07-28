# Wuzzle，不 eject 也能定制 create-react-app 创建的 React 应用

作为 React 官方维护的命令行工具，[create-react-app](https://github.com/facebook/create-react-app)（简称 CRA）能够极其轻松地创建[配置完备](https://github.com/facebook/create-react-app/tree/v5.0.1#whats-included)的 React 应用，帮助使用者快速进入 React 开发。它的最大缺憾是创建的应用不能随心所欲地定制配置。想要定制，只能 [eject](https://github.com/facebook/create-react-app/blob/v5.0.1/docusaurus/docs/available-scripts.md#npm-run-eject)。而 eject 就意味着应用所有的配置都交由使用者维护，繁琐令人望而却步。

现在，通过 [wuzzle](https://github.com/host1-tech/wuzzle)，我们能够在不 eject 的情况下任意定制 CRA 创建的 React 应用。

## 不 eject 的情况下查看 CRA webpack 配置

首先，用 CRA 创建一个支持 TypeScript 的演示应用（如果不习惯用 TS 去掉参数 `--template typescript` 即可）：

```sh
$ npx create-react-app --template typescript demo
# ...
$ cd demo
```

安装 wuzzle：

```sh
$ npm i -D wuzzle
```

打开 `package.json` 编辑 `scripts` 挂载 wuzzle：

```diff
  "scripts": {
-    "start": "react-scripts start",
+    "start": "wuzzle react-scripts start",
-    "build": "react-scripts build",
+    "build": "wuzzle react-scripts build",
  },
```

现在，通过参数 `--dry-run` 运行 `start` 或 `build` 脚本就可以直接查看 CRA 内部使用的 webpack 配置了：

```sh
$ npm run build -- --dry-run
# ...
@wuzzle/cli:applyConfig Webpack config with difference: {
  # ...
  devtool: # ...
  entry: # ...
  output: #...
  cache: #...
  resolve: # ...
  module: # ...
  plugins: # ...
  # ...
}
```

## 不 eject 的情况下引入 less、使用 antd

在样式文件上，CRA 应用支持 css、scss/sass，但不支持 less。想要全面使用 [antd](https://github.com/ant-design/ant-design) 并做主题修改，需要在 webpack 配置引入 less。回到 `--dry-run` 运行结果细看一下 module 字段：

```sh
$ npm run build -- --dry-run
# ...
@wuzzle/cli:applyConfig Webpack config with difference: {
  # ...
  module: {
    # ...
    rules: [
      # ...
      {
        oneOf: [
          # ...
          {
            test: /\.(scss|sass)$/,
            exclude: /\.module\.(scss|sass)$/,
            use: [
              {
                loader: '.../mini-css-extract-plugin/dist/loader.js',
                options: {}
              },
              {
                loader: '.../css-loader/...',
                options: # ...
              },
              {
                loader: '.../postcss-loader/...',
                options: # ...
              },
              {
                loader: '.../resolve-url-loader/...',
                options: # ...
              },
              {
                loader: '.../sass-loader/...',
                options: # ...
              }
            ],
          },
          {
            test: /\.module\.(scss|sass)$/,
            use: [
              {
                loader: '.../mini-css-extract-plugin/dist/loader.js',
                options: # ...
              },
              {
                loader: '.../css-loader/...',
                options: # ...
              },
              {
                loader: '.../postcss-loader/...',
                options: # ...
              },
              {
                loader: '.../resolve-url-loader/...',
                options: # ...
              },
              {
                loader: '.../sass-loader/...',
                options: # ...
              }
            ]
          },
          # ...
        ]
      }
    ]
  },
  # ...
}
```

不难发现，sass 的配置方法和 less 的很接近，只要稍加改造，把 sass-loader 替换成 less-loader 并去掉 resolve-url-loader 就达成目标了。

安装一下配置 less 所需的依赖：

```
npm i -D less less-loader
```

然后，在 `package.json` 旁创建文件 `wuzzle.config.js` 修改 CRA 内部使用的 webpack 配置，这里可以使用 wuzzle 提供的[修改帮助方法](https://github.com/host1-tech/wuzzle/tree/v0.6.3#modification-utilities-on-webpack-configs)减轻工作量：

```js
const appPaths = require('react-scripts/config/paths');
const { deleteUseItem, firstRule, firstUseItem, replaceUseItem } = require('wuzzle');

module.exports = (webpackConfig, webpack, wuzzleContext) => {
  const { commandArgs } = wuzzleContext;

  if (commandArgs[0] === 'start' || commandArgs[0] === 'build') {
    // Replace sass-loader with less-loader to support .less files
    const lessOptions = { javascriptEnabled: true };

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
};
```

之后，把所有的 `.css` 文件后缀改为 `.less`：

- 把 `index.css` 重命名为 `index.less`，在 `index.tsx` 把 `import './index.css';` 改为 `import './index.less';`。
- 把 `App.css` 重命名为 `App.less`，在 `App.tsx` 把 `import './App.css';` 改为 `import './App.less';`。

安装一下 antd：

```sh
$ npm i -S antd
```

在 `index.less` 引入 antd 样式文件：

```diff
-body {
-  ...
-}
-code {
-  ...
-}
+@import '~antd/dist/antd.less';
```

如果想要修改 antd 主题的话，可以回到 `wuzzle.config.js` 在 `lessOptions` 中添加 `modifyVars` 字段，比如：

```diff
-    const lessOptions = { javascriptEnabled: true };
+    const lessOptions = {
+      javascriptEnabled: true,
+      modifyVars: { '@primary-color': '#1da57a' },
+    };
```

现在，运行 `start` 或 `build` 脚本就可以看到在 CRA 应用中引入 less、使用 antd 的效果了：

```sh
$ npm start
Starting the development server...
Compiled successfully!

You can now view demo in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.100.24:3000

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
No issues found.
```

## 不 eject 的情况下调整 CRA test 配置

CRA test 内部是基于 jest 封装的，不是 webpack。对于 jest，wuzzle 提供了两种定制配置的方法：

1. 以兼容的 wepback 编译替代 jest 自身的编译，使用者修改 webpack 编译配置。
2. 继续使用 jest 自己的编译，使用者修改 jest 编译配置。

分别看下如何通过这两种方法引入 less 保持 `test` 脚本兼容。

### 方法 1

回到 `package.json`，编辑 `scripts` 为 `test` 脚本挂载上 wuzzle：

```diff
  "scripts": {
-    "test": "react-scripts test",
+    "test": "wuzzle react-scripts test",
  },
```

然后，通过参数 `--dry-run` 运行 `test` 脚本查看替代 jest 自身编译的 webpack 编译的配置：

```sh
$ npm test -- --dry-run
# ...
@wuzzle/cli:applyConfig Webpack config with difference: {
  # ...
  module: {
    rules: [
      {
        test: /\.(js|jsx|mjs|cjs|ts|tsx)$/,
        exclude: /node_modules/,
        use: # ...
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: '.../null-loader/...'
          }
        ]
      },
      {
        test: /\.svg$/,
        exclude: /node_modules/,
        use: # ...
      },
      {
        exclude: [ /\.(js|jsx|mjs|cjs|ts|tsx|json|css|svg)$/, /node_modules/ ],
        use: # ...
      }
    ]
  },
  # ...
}
```

可以发现，只要在 css 配置中添加对 `.less` 文件的匹配、在兜底配置中去掉对 `.less` 文件的匹配就可以了。

回到 `wuzzle.config.js`，修改替代 jest 自身编译的 webpack 编译的配置：

```diff
module.exports = (webpackConfig, webpack, wuzzleContext) => {
  const { commandArgs } = wuzzleContext;

  // ...

+  if (commandArgs[0] === 'test') {
+    const cssRule = firstRule(webpackConfig, { file: 'index.css' });
+    cssRule.test = [cssRule.test, /\.less$/];
+
+    const fallbackRule = firstRule(webpackConfig, { file: 'index.fallback' });
+    fallbackRule.exclude.push(/\.less$/);
+  }
};
```

现在，运行 `test` 脚本就可以看到 CRA test 中引入 less 的效果了：

```sh
$ npm test
# ...
File 'src/setupTests.ts' compiled.
File 'src/App.test.tsx' compiled.
File 'src/App.tsx' compiled.
File 'src/App.less' compiled.
File 'src/logo.svg' compiled.
 PASS  src/App.test.tsx (10.183 s)
  ✓ renders learn react link (40 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        11.005 s
Ran all test suites related to changed files.
```

### 方法 2

回到 `package.json`，再次编辑 `scripts` 的 `test` 脚本添加参数 `--no-webpack` 关闭 webpack 编译：

```diff
  "scripts": {
-    "test": "wuzzle react-scripts test",
+    "test": "wuzzle react-scripts test --no-webpack",
  },
```

然后，通过参数 `--dry-run` 运行 `test` 脚本查看 jest 自身编译的配置：

```sh
$ npm test -- --dry-run
# ...
@wuzzle/cli:applyConfig Jest config with difference: {
  # ...
  transform: [
    [
      '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$',
      '.../node_modules/react-scripts/config/jest/babelTransform.js',
      {}
    ],
    [
      '^.+\\.css$',
      '.../node_modules/react-scripts/config/jest/cssTransform.js',
      {}
    ],
    [
      '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)',
      '.../node_modules/react-scripts/config/jest/fileTransform.js',
      {}
    ]
  ],
  # ...
}
```

这个配置与 jest 的用户配置略有不同，是 jest 内部使用的配置，结构参考 [ProjectConfig](https://github.com/facebook/jest/blob/v24.9.0/packages/jest-types/src/Config.ts#L367-L421)。与方法 1 类似的，只要在 css 配置中添加对 `.less` 文件的匹配、在兜底配置中去掉对 `.less` 文件的匹配就可以了。

回到 `wuzzle.config.js`，先新建个对象把原本直接导出的方法放进 `modify` 字段导出：

```js
module.exports = {
  modify(webpackConfig, webpack, wuzzleContext) {
    // Place the directly exported top-level function here.
  },
};
```

之后，继续在 `wuzzle.config.js` 添加 `jest` 字段来修改 jest 编译配置：

```diff
module.exports = {
  modify(webpackConfig, webpack, wuzzleContext) { // ...
  },

+  jest(jestConfig, jestInfo, wuzzleContext) {
+    for (const transformItem of jestConfig.transform) {
+      const fileRegExp = new RegExp(transformItem[0]);
+      if (fileRegExp.test('index.css')) {
+        transformItem[0] = '^.+\\.(css|less)$';
+      }
+      if (fileRegExp.test('index.fallback')) {
+        transformItem[0] = '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|less|json)$)';
+      }
+    }
+  },
};
```

现在，运行 `test` 脚本就可以同样看到 CRA test 中引入 less 的效果了。不一样的是，因为关闭了 webpack 编译，性能可能会好一些。

## 更进一步定制

截止这里，已经定制了 CRA 应用的所有脚本，就不再需要 `eject` 脚本了，可以编辑 `package.json`：

```diff
  "scripts": {
-    "eject": "react-scripts eject",
  }
```

在真实项目中，也许还会用到 SSR（服务端渲染）、E2E（端到端测试）、深入配置 eslint。关于如何结合使用 CRA 和 wuzzle 更进一步搭建真实应用，可以参考官方示例 [e2e/.../react-scripts](https://github.com/host1-tech/wuzzle/tree/v0.6.3/e2e/realworld-use/fixtures/react-scripts)。

## 写在最后

目前，文章中的示例工程已经收录在了 [wuzzle-blog/.../demo](https://github.com/host1-tech/wuzzle-blog/tree/master/001/demo)，读者朋友可以按需打开参考，有任何疑问或想法，欢迎留言。此外，如果对 wuzzle 有任何疑问或想法，欢迎在 [wuzzle/issues](https://github.com/host1-tech/wuzzle/issues) 新建 issue，中英文都可以。如果有兴趣和时间贡献代码，欢迎提交 PR，具体可以参考[开发引导](https://github.com/host1-tech/wuzzle/blob/master/CONTRIBUTING.md)。最后，如果觉得小工具有帮助，可以在 GitHub repo [wuzzle](https://github.com/host1-tech/wuzzle) 点个小 ⭐️，比心。

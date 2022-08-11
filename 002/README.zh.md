# Wuzzle，进行基于 webpack 的 JS 转译

转译器（transpiler）是指能够进行文件到文件一对一转换的编译器（compiler）。在 JS 世界中，常见的开箱即可用的转译器有 [typescript cli](https://www.typescriptlang.org/docs/handbook/compiler-options.html)、[babel cli](https://babeljs.io/docs/en/babel-cli) 等，但他们一般只处理 `.js`、`.ts` 等脚本文件。而 webpack 尽管能通过配置处理各种文件，但他更关注如何打包 JS，做文件一对一转换相当麻烦。

为了解决这些局限，[wuzzle](https://github.com/host1-tech/wuzzle) 作为配置 webpack 编译的补充者，提供了基于 webpack 封装的 JS 转译命令 `wuzzle transpile`，以下是具体用法。

## 使用 `wuzzle transpile` 转译 `.ts` 文件

首先，我们看下 `wuzzle transpile` 对 `.ts` 文件的转译。初始化一个空目录 `demo`，并安装 wuzzle：

```sh
$ mkdir demo
# ...
$ cd demo
# ...
$ npm init -y
# ...
$ npm i -D wuzzle
```

在 `src/server.ts` 准备一份简易服务器代码，并安装所需依赖：

```ts
import express from 'express';

const port = process.env.PORT ?? '5000';

const app = express();

app.get('/', (req, res) => {
  res.send('<!DOCTYPE html><html><head></head><body>Hello, wuzzle!</body></html>');
});

app.listen(port, () => console.log(`Started on port ${port}.`));
```

```sh
$ npm i -S express
# ...
$ npm i -D @types/express
```

默认情况下 `wuzzle transpile` 的转译行为等同于零配置的 webpack，几乎不做任何事情，需要安装 webpack 处理 `.ts` 文件所需依赖并进行配置。

因此，安装 `typescript`、`ts-loader`，借助 `tsc --init` 创建 `tsconfig.json`：

```sh
$ npm i -D "ts-loader@^7.0.5" "typescript@~4.6.0"
# ...
$ npx tsc --init
Created a new tsconfig.json with: # ...
```

然后，在 `package.json` 旁创建文件 `wuzzle.config.js` 配置 `wuzzle transpile`：

```js
module.exports = (webpackConfig) => {
  webpackConfig.module = {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  };
  webpackConfig.resolve = {
    extensions: ['.ts', '.js', '.json'],
  };
};
```

同时，方便起见，在 `package.json` 写入启动脚本和构建脚本：

```diff
  "scripts": {
-    "test": "echo \"Error: no test specified\" && exit 1"
+    "start": "node dist/server",
+    "build": "wuzzle transpile \"src/**/*\" -d dist"
  },
```

现在，执行 `build` 脚本，就可以通过 `wuzzle transpile` 将 `.ts` 文件转译成 `.js` 文件了：

```sh
$ npm run build
Start compiling 'src/**/*.ts'.
File 'src/server.ts' compiled.
All files compiled.
```

转译完成之后，通过 `start` 脚本，就可以启动这个服务器了，访问 `http://localhost:5000`，就可以看到运行效果了：

```sh
$ npm start
# ...
Started on port 5000.
```

## 使用 `wuzzle transpile` 转译图片文件

接下来我们再看下 `wuzzle transpile` 对其他文件的转译，比如图片。其实这和转译 `.ts` 文件类似，都是把输入文件按照指定配置转换成 `.js` 文件，不同的只是输入文件是图片。

这里，使用 `url-loader` 处理图片，安装一下依赖：

```sh
$ npm i -D url-loader
```

调整 `wuzzle.config.js`：

```diff
  webpackConfig.module = {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
+      {
+        test: /\.jpg$/,
+        loader: 'url-loader',
+      },
    ],
  };
```

然后，放入图片 `src/logo.jpg`，并在 `src/server.ts` 引用：

```diff
import express from 'express';
+import logo from './logo.jpg';

...

app.get('/', (req, res) => {
-  res.send(`<!DOCTYPE html><html><head></head><body>Hello, wuzzle!</body></html>`);
+  res.send(`<!DOCTYPE html><html><head></head><body><img src="${logo}" /></body></html>`);
});
```

为了 TS 类型检查能够正确识别图片文件，创建文件 `src/modules.d.ts`：

```ts
declare module '*.jpg' {
  const o: string;
  export default o;
}
```

现在，关闭正在运行的 `npm start`、重新执行 `npm run build`、`npm start`、刷新 `http://localhost:5000`，就可以看到转译图片文件并引用的运行效果了。

## 优化与调试

不难发现，`dist` 目录下的构建产物存在两个小问题：1 是大小没有压缩过，2 是没有生成 source map。这可以在 `package.json` 的构建脚本中添加参数 `-p` 和 `-s` 进行优化：

```diff
  "scripts": {
    ...
-    "build": "wuzzle transpile \"src/**/*\" -d dist"
+    "build": "wuzzle transpile \"src/**/*\" -d dist -p -s"
  }
```

另外，还有个开发体验上的小问题，每次修改 `src` 下的文件要重新手动的构建和启动。这可以结合参数 `-w` 和 [`nodemon`](https://github.com/remy/nodemon) 来解决。

先在 `package.json` 写入 `watch` 脚本：

```diff
  "scripts": {
    ...
+    "watch": "wuzzle transpile \"src/**/*\" -d dist -w -s"
  },
```

`watch` 脚本会进行一次完整的构建后监视 `src/**/*` 以重新构建变化的文件。其中，参数 `-s` 用于生成 source map。

之后，安装 `nodemon` 以及另一个辅助命令行工具 [`concurrently`](https://github.com/open-cli-tools/concurrently) 并在 `package.json` 写入 `dev` 脚本：

```sh
$ npm i -D nodemon concurrently
```

```diff
  "scripts": {
    ...
+    "dev": "concurrently \"npm:watch\" \"nodemon dist/server -d 2 -w dist\""
  }
```

`dev` 脚本会并行执行 `watch` 脚本和 `nodemon` 命令，当 `src` 目录下有文件变化时 `dist` 目录下对应文件就会被重新构建，而这就会让服务器重新启动。这样，在调试时就可以用 `dev` 脚本获得一个更好的开发体验了。

## 什么时候用 `wuzzle transpile`

如果要转译的输入文件主要是 `.js`、`.ts` 等脚本文件，typescript cli、babel cli 也许就够用了。但如果遇到像示例中的那样要转译图片或者其他非脚本类文件的情况，`wuzzle transpile` 会是个很不错的选择。

典型的场景比如做 SSR（服务端渲染）的时候，浏览器端已经配置好了 webpack 打包，服务端就可以复用同一个配置通过 `wuzzle transpile` 做 JS 转译，让浏览器端代码被无缝的引用到服务端。同时，相比于在服务端复用同一个配置直接进行 webpack 打包，这能够保留构建前后的目录结构，让服务端开发保持简单。

有兴趣深入的话，wuzzle 官方示例 [e2e/.../react-scripts](https://github.com/host1-tech/wuzzle/tree/v0.6.3/e2e/realworld-use/fixtures/react-scripts) 提供了结合使用 CRA 和 wuzzle 搭建的真实应用，其中，`src/server` 目录实现了 SSR 可以参考。

## 写在最后

目前，文章中的示例工程已经收录在了 [wuzzle-blog/.../demo](https://github.com/host1-tech/wuzzle-blog/tree/master/002/demo)，读者朋友可以按需打开参考，有任何疑问或想法，欢迎留言。此外，如果对 wuzzle 有任何疑问或想法，欢迎在 [wuzzle/issues](https://github.com/host1-tech/wuzzle/issues) 新建 issue，中英文都可以。如果有兴趣和时间贡献代码，欢迎提交 PR，具体可以参考[开发引导](https://github.com/host1-tech/wuzzle/blob/master/CONTRIBUTING.md)。最后，如果觉得小工具有帮助，可以在 GitHub repo [wuzzle](https://github.com/host1-tech/wuzzle) 点个小 ⭐️，比心。

module.exports = (webpackConfig) => {
  webpackConfig.module = {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
      {
        test: /\.jpg$/,
        loader: 'url-loader',
      },
    ],
  };
  webpackConfig.resolve = {
    extensions: ['.ts', '.js', '.json'],
  };
};

module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        // use: {
        //   loader: "babel-loader"
        // }
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env',
                    '@babel/react',{
                    'plugins': ['@babel/plugin-proposal-class-properties']}]
        }
      },
      {
        test: /\.css$/,
        use: [
          // 'style-loader',
          'css-loader'
        ]
      }
    ],
  },
  watch: true,
    watchOptions: {
    poll: true,
    ignored: /node_modules/
  }
};

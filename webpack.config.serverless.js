const slsw = require( 'serverless-webpack' );
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// Convert paths for copy-webpack-plugin
const convertPattern = (s) => {
  if (s.endsWith("*")) return s
  if (!s.includes("/")) return s

  const i = s.lastIndexOf("/")
  return {from: s, to: s.substring(0, i) + "/"}
}

// Get value from path in object
const get = (obj, path, defaultValue = undefined) => {
  const travel = regexp =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

module.exports = {
  entry: slsw.lib.entries,
  externals: [ 'aws-sdk', 'dtrace-provider', 'duckdb' ],
  target: 'node',
  mode: slsw.lib.options.stage === 'dev' ? 'development' : 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          /(node_modules)/,
        ],
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', {
              "targets": {
                "node": "16"
              }
            }]],
            plugins: [
              '@babel/plugin-transform-runtime',
              '@babel/plugin-proposal-optional-chaining'
            ]
          }
        },
      },
    ],
  },
  plugins: [
    // See https://github.com/serverless-heaven/serverless-webpack/issues/425#issuecomment-736364529
    {
      apply: (compiler) => {
        // Get handler
        const handler = `${Object.keys(compiler.options.entry)[0]}.handler`;
        // Transform functions from object to array
        const functions = Object.getOwnPropertyNames(slsw.lib.serverless.service.functions).map(functionName => slsw.lib.serverless.service.functions[functionName]);
        // Get config
        const config = functions.find(
          (val) => val.handler === handler
        );
        // Find paths to inlcude
        let includePaths = get(config, "package.include", []);
        // Convert paths
        includePaths = includePaths.map(convertPattern);
        // Copy files if paths are found
        if (includePaths.length) {
          new CopyWebpackPlugin({patterns: includePaths}).apply(compiler)
        }
      },
    },
  ],
  output: {
    libraryTarget: 'commonjs',
    path: path.join( __dirname, '.webpack' ),
    filename: '[name].js',
  },
};

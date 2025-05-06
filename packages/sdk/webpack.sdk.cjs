// @ts-nocheck

const path = require("path");
const webpack = require("webpack");

module.exports = (env) => {
  const isProduction = env.production;
  const EMBED_URL = isProduction ? "https://helper.ai/widget/embed" : `https://helperai.dev/widget/embed`;

  const baseConfig = {
    mode: isProduction ? "production" : "development",
    entry: path.resolve(__dirname, "src/index.ts"),
    resolve: {
      extensions: [".ts", ".js"],
      alias: {
        "@": __dirname,
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-typescript"],
            },
          },
        },
        {
          test: /\.css$/,
          use: "raw-loader",
        },
        {
          test: /modern-screenshot\/dist\/worker.js$/,
          type: "asset/resource",
          generator: {
            filename: "sdk-modern-screenshot-worker.js",
          },
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        __EMBED_URL__: JSON.stringify(EMBED_URL),
      }),
    ],
    optimization: {
      minimize: isProduction,
    },
  };

  const outputOptions = {
    filename: "sdk.js",
    chunkFilename: "sdk-[name]-[chunkhash].js",
    library: {
      name: "HelperWidget",
      type: "umd",
      export: "default",
    },
    globalObject: "this",
  };

  return [
    {
      ...baseConfig,
      output: {
        ...outputOptions,
        path: path.resolve(__dirname, "dist"),
      },
    },
    {
      ...baseConfig,
      output: {
        ...outputOptions,
        path: path.resolve(__dirname, "../../public"),
      },
    },
  ];
};

// @ts-nocheck

const path = require("path");
const webpack = require("webpack");

module.exports = (env) => {
  const isProduction = env.production;
  const EMBED_URL = isProduction ? "https://helper.ai/widget/embed" : `https://helperai.dev/widget/embed`;

  const baseConfig = {
    mode: isProduction ? "production" : "development",
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

  const outputOptions = {};

  return [
    {
      ...baseConfig,
      entry: path.resolve(__dirname, "src/utils.ts"),
      output: {
        filename: "utils.js",
        library: {
          type: "module",
        },
        path: path.resolve(__dirname, "dist/esm"),
      },
      experiments: {
        outputModule: true,
      },
    },
    {
      ...baseConfig,
      entry: path.resolve(__dirname, "src/index.ts"),
      output: {
        filename: "sdk.js",
        chunkFilename: "sdk-[name]-[chunkhash].js",
        globalObject: "this",
        library: {
          name: "HelperWidget",
          type: "umd",
          export: "default",
        },
        path: path.resolve(__dirname, "../../public"),
      },
    },
  ];
};

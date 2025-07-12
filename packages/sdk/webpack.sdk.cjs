// @ts-nocheck

const path = require("path");

module.exports = (env) => {
  const isProduction = env.production;

  const baseConfig = {
    mode: isProduction ? "production" : "development",
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        "@": __dirname,
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"],
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
    optimization: {
      minimize: isProduction,
    },
  };

  const outputOptions = {};

  return [
    {
      ...baseConfig,
      entry: path.resolve(__dirname, "src/module.ts"),
      output: {
        filename: "module.js",
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
      entry: path.resolve(__dirname, "src/module.ts"),
      output: {
        filename: "module.js",
        library: {
          type: "umd",
        },
        path: path.resolve(__dirname, "dist/umd"),
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

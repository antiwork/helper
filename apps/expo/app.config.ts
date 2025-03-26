import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ConfigContext, ExpoConfig } from "expo/config";

function getGoogleServicesFilePath() {
  if (process.env.GOOGLE_SERVICES_JSON_CONTENT) {
    // Expo is supposed to support file env vars to avoid this, but they often don't work properly
    const tempPath = path.join(os.tmpdir(), "google-services.json");
    fs.writeFileSync(tempPath, process.env.GOOGLE_SERVICES_JSON_CONTENT);
    return tempPath;
  } else if (fs.existsSync("./google-services.json")) {
    return "./google-services.json";
  }
  throw new Error("Google services file not found");
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Helper",
  slug: "helper",
  version: "1.0.3",
  orientation: "portrait",
  icon: "./src/assets/images/icon.png",
  scheme: "helperai",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./src/assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#480F0E",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.antiwork.helper",
    usesAppleSignIn: true,
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./src/assets/images/adaptive-icon.png",
      monochromeImage: "./src/assets/images/adaptive-icon-mono.png",
      backgroundColor: "#480F0E",
    },
    package: "com.antiwork.helper",
    googleServicesFile: getGoogleServicesFilePath(),
  },
  androidStatusBar: {
    backgroundColor: "#480F0E",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./src/assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "@sentry/react-native/expo",
      {
        organization: "gumroad-to",
        project: "helper-expo",
      },
    ],
    "expo-font",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./src/assets/images/notification-icon.png",
        color: "#480F0E",
      },
    ],
    "expo-apple-authentication",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "742dc9fe-0a87-4204-a138-ce86ddd417c4",
    },
  },
  owner: "antiwork",
  updates: {
    url: "https://u.expo.dev/742dc9fe-0a87-4204-a138-ce86ddd417c4",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
});

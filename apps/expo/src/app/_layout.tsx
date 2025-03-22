import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "@/hooks/useColorScheme";
import "../styles.css";
import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { cssInterop } from "nativewind";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Svg } from "react-native-svg";
import { UpdateBanner } from "@/components/updateBanner";
import { TRPCProvider } from "@/utils/api";
import { backgroundColor } from "@/utils/css";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

const scope = Sentry.getGlobalScope();

scope.setTag("expo-update-id", Updates.updateId);
scope.setTag("expo-is-embedded-update", Updates.isEmbeddedLaunch);

const manifest = Updates.manifest;
const metadata = "metadata" in manifest ? manifest.metadata : undefined;
const extra = "extra" in manifest ? manifest.extra : undefined;
const updateGroup = metadata && "updateGroup" in metadata ? metadata.updateGroup : undefined;

if (typeof updateGroup === "string") {
  scope.setTag("expo-update-group-id", updateGroup);

  const owner = extra?.expoClient?.owner ?? "[account]";
  const slug = extra?.expoClient?.slug ?? "[project]";
  scope.setTag("expo-update-debug-url", `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`);
} else if (Updates.isEmbeddedLaunch) {
  // The update is the one embedded in the build, and not one downloaded from the updates server.
  scope.setTag("expo-update-debug-url", "not applicable for embedded updates");
}

cssInterop(Ionicons, {
  className: {
    target: "style",
  },
});

cssInterop(Svg, {
  className: {
    target: "style",
    nativeStyleToProp: { width: true, height: true, color: true },
  },
});

function RootLayout() {
  const colorScheme = useColorScheme();

  const tokenCache = {
    async getToken(key: string) {
      try {
        const item = await SecureStore.getItemAsync(key);
        if (item) {
          console.log(`${key} was used 🔐 \n`);
        } else {
          console.log(`No values stored under key: ${key}`);
        }
        return item;
      } catch (error) {
        console.error("SecureStore get item error: ", error);
        await SecureStore.deleteItemAsync(key);
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        return await SecureStore.setItemAsync(key, value);
      } catch {}
    },
  };

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(backgroundColor(colorScheme));
  }, [colorScheme]);

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <TRPCProvider>
            <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
              <StatusBar backgroundColor={backgroundColor(colorScheme)} />
              <UpdateBanner />
              <Stack>
                <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
                <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
            </ThemeProvider>
          </TRPCProvider>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayout);

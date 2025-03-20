import { useAuth } from "@clerk/clerk-expo";
import { Redirect, router, Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Pressable, Text } from "react-native";
import { backgroundColor } from "@/utils/css";

export default function DashboardLayout() {
  const { isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  const headerOptions = {
    headerTintColor: colorScheme === "dark" ? "#ffffff" : "#000000",
    headerStyle: { backgroundColor: backgroundColor(colorScheme) },
  };

  return (
    <Stack>
      <Stack.Screen name="(index)" options={{ title: "Dashboard", headerShown: false }} />
      <Stack.Screen name="agents" options={{ title: "Agents", ...headerOptions }} />
      <Stack.Screen name="conversations" options={headerOptions} />
      <Stack.Screen
        name="conversations/[id]"
        options={{ ...headerOptions, headerBackButtonDisplayMode: "minimal", title: "" }}
      />
      <Stack.Screen
        name="profile"
        options={{
          presentation: "modal",
          title: "Settings",
          ...headerOptions,
          headerRight: () => (
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: headerOptions.headerTintColor, fontSize: 17 }}>Done</Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useRef } from "react";
import { Linking, Platform, TouchableOpacity, View } from "react-native";
import { InformationCircleIcon, LinkIcon } from "react-native-heroicons/outline";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAuthenticatedUrl } from "@/components/useGenerateUrl";
import { api } from "@/utils/api";
import { backgroundColor, cssIconInterop } from "@/utils/css";

cssIconInterop(InformationCircleIcon);
cssIconInterop(LinkIcon);

const injectedJavaScript = `
  window.__EXPO__ = {
    platform: "${Platform.OS}",

    onToggleSidebar: (listener) => {
      window.__EXPO__._sidebarListeners.push(listener);
    },
    _sidebarListeners: [],
    _toggleSidebar: () => {
      window.__EXPO__._sidebarListeners.forEach((listener) => listener());
    },
  }
`;

export default function ConversationView() {
  const { colorScheme } = useColorScheme();
  const { id, mailboxSlug } = useLocalSearchParams<{ id: string; mailboxSlug: string }>();
  const webViewRef = useRef<WebView>(null);
  const navigation = useNavigation();

  const utils = api.useUtils();

  const url = useAuthenticatedUrl(`/mailboxes/${mailboxSlug}/conversations?id=${id}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolvedUrl = useMemo(() => url?.(), [!!url]);

  if (!resolvedUrl) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom"]} className="relative flex-1 bg-background">
        <WebView
          ref={webViewRef}
          source={{ uri: resolvedUrl }}
          style={{ backgroundColor: backgroundColor(colorScheme) }}
          injectedJavaScript={injectedJavaScript}
          onMessage={({ nativeEvent }) => {
            const data = JSON.parse(nativeEvent.data);
            if (data.type === "conversationLoaded") {
              navigation.setOptions({
                title: data.subject,
                headerRight: () => (
                  <View className="flex flex-row items-center gap-6 pl-4">
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setStringAsync(resolvedUrl);
                      }}
                    >
                      <LinkIcon className="h-6 w-6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => webViewRef.current?.injectJavaScript("window.__EXPO__._toggleSidebar();")}
                    >
                      <InformationCircleIcon className="h-6 w-6" />
                    </TouchableOpacity>
                  </View>
                ),
              });
            } else if (data.type === "openUrl" && data.url) {
              Linking.openURL(data.url);
            } else if (data.type === "conversationUpdated") {
              utils.mailbox.conversations.list.invalidate();
            }
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

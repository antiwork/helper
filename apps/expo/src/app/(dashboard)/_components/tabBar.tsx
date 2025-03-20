import { usePathname, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { HomeIcon, InboxIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn, cssIconInterop } from "@/utils/css";

cssIconInterop(HomeIcon);
cssIconInterop(InboxIcon);

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaView
      edges={["bottom"]}
      // className="h-[60px] flex-row border-t border-t-black/10 pb-[5px] bg-muted"
      // style={{ backgroundColor: backgroundColor(colorScheme) }}
      className="py-2 flex-row bg-muted"
    >
      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/")}>
        <HomeIcon className={cn("size-6", pathname === "/" ? "text-primary" : "text-muted-foreground")} />
        <Text className={cn("text-xs mt-[3px]", pathname === "/" ? "text-primary" : "text-muted-foreground")}>
          Dashboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/inbox")}>
        <InboxIcon className={cn("size-6", pathname === "/inbox" ? "text-primary" : "text-muted-foreground")} />
        <Text className={cn("text-xs mt-[3px]", pathname === "/inbox" ? "text-primary" : "text-muted-foreground")}>
          Inbox
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

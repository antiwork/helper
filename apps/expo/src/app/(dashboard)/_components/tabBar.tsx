import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChartBarIcon, InboxIcon, StarIcon, UserIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn, cssIconInterop } from "@/utils/css";

cssIconInterop(ChartBarIcon);
cssIconInterop(UserIcon);
cssIconInterop(StarIcon);
cssIconInterop(InboxIcon);

function Badge({ count }: { count: number }) {
  return (
    <View className="absolute -top-1 -right-2 bg-bright rounded-full min-w-4 h-4 justify-center items-center">
      <Text className="text-xs text-medium text-bright-foreground px-1">{count}</Text>
    </View>
  );
}

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();

  // Placeholder counts for badges
  const vipCount = 3;

  return (
    <SafeAreaView edges={["bottom"]} className="py-2 flex-row bg-muted">
      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/")}>
        <ChartBarIcon className={cn("size-6", pathname === "/" ? "text-primary" : "text-muted-foreground")} />
        <Text className={cn("text-xs mt-[3px]", pathname === "/" ? "text-primary" : "text-muted-foreground")}>
          Dashboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/vips")}>
        <View className="relative">
          <StarIcon className={cn("size-6", pathname === "/vips" ? "text-primary" : "text-muted-foreground")} />
          <Badge count={vipCount} />
        </View>
        <Text className={cn("text-xs mt-[3px]", pathname === "/vips" ? "text-primary" : "text-muted-foreground")}>
          VIPs
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-1 justify-center items-center pt-[5px]"
        onPress={() => router.push("/assigned")}
      >
        <UserIcon className={cn("size-6", pathname === "/assigned" ? "text-primary" : "text-muted-foreground")} />
        <Text className={cn("text-xs mt-[3px]", pathname === "/assigned" ? "text-primary" : "text-muted-foreground")}>
          Assigned
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/inbox")}>
        <InboxIcon className={cn("size-6", pathname === "/inbox" ? "text-primary" : "text-muted-foreground")} />
        <Text className={cn("text-xs mt-[3px]", pathname === "/inbox" ? "text-primary" : "text-muted-foreground")}>
          All
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

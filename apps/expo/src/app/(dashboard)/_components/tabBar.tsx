import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChartBarIcon, InboxIcon, StarIcon, UserIcon } from "react-native-heroicons/outline";
import {
  ChartBarIcon as ChartBarIconSolid,
  InboxIcon as InboxIconSolid,
  StarIcon as StarIconSolid,
  UserIcon as UserIconSolid,
} from "react-native-heroicons/solid";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn, cssIconInterop } from "@/utils/css";

cssIconInterop(ChartBarIcon);
cssIconInterop(UserIcon);
cssIconInterop(StarIcon);
cssIconInterop(InboxIcon);
cssIconInterop(ChartBarIconSolid);
cssIconInterop(InboxIconSolid);
cssIconInterop(StarIconSolid);
cssIconInterop(UserIconSolid);

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
        {pathname === "/" ? (
          <ChartBarIconSolid className="size-6 text-primary" />
        ) : (
          <ChartBarIcon className="size-6 text-muted-foreground" />
        )}
        <Text className={cn("text-xs mt-[3px]", pathname === "/" ? "text-primary" : "text-muted-foreground")}>
          Dashboard
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/vips")}>
        <View className="relative">
          {pathname === "/vips" ? (
            <StarIconSolid className="size-6 text-primary" />
          ) : (
            <StarIcon className="size-6 text-muted-foreground" />
          )}
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
        {pathname === "/assigned" ? (
          <UserIconSolid className="size-6 text-primary" />
        ) : (
          <UserIcon className="size-6 text-muted-foreground" />
        )}
        <Text className={cn("text-xs mt-[3px]", pathname === "/assigned" ? "text-primary" : "text-muted-foreground")}>
          Assigned
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-1 justify-center items-center pt-[5px]" onPress={() => router.push("/inbox")}>
        {pathname === "/inbox" ? (
          <InboxIconSolid className="size-6 text-primary" />
        ) : (
          <InboxIcon className="size-6 text-muted-foreground" />
        )}
        <Text className={cn("text-xs mt-[3px]", pathname === "/inbox" ? "text-primary" : "text-muted-foreground")}>
          All
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

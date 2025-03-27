import { Href, Link } from "expo-router";
import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { cn, cssIconInterop } from "@/utils/css";

cssIconInterop(ChevronRightIcon);

export function Panel({
  title,
  children,
  action,
  href,
  isSkeleton,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  href: Href | null;
  isSkeleton?: boolean;
}) {
  return (
    <View className="mt-4 px-6">
      <Link href={href ?? "/"} disabled={!href} asChild>
        <TouchableOpacity
          className="bg-white border border-gray-200 dark:border-border dark:bg-muted rounded-xl dark:bg-muted dark:text-muted-foreground"
          activeOpacity={0.8}
        >
          <View className="p-4 flex-row gap-2 items-center justify-between">
            <Text
              className={cn(
                "flex-1 text-sm uppercase font-semibold text-bright-foreground dark:text-muted-foreground",
                isSkeleton && "flex-none w-32 bg-muted text-muted rounded",
              )}
            >
              {title}
            </Text>
            {action}
            {href && <ChevronRightIcon className="ml-2 h-4 w-4 text-muted-foreground" />}
          </View>
          {children}
        </TouchableOpacity>
      </Link>
    </View>
  );
}

import { Href, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { ExclamationCircleIcon, InformationCircleIcon, StarIcon, UserIcon } from "react-native-heroicons/outline";
import Animated, { useAnimatedScrollHandler } from "react-native-reanimated";
import { useAuthenticatedUrl } from "@/components/useGenerateUrl";
import { api } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";

cssIconInterop(ExclamationCircleIcon);
cssIconInterop(StarIcon);
cssIconInterop(UserIcon);
cssIconInterop(InformationCircleIcon);

const formatHours = (hours: number) => {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} ${days === 1 ? "day" : "days"} or more`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"} or more`;
};

function AlertCard({
  icon: Icon,
  variant,
  children,
  screenWidth,
  href,
  onPress,
}: {
  icon: typeof ExclamationCircleIcon;
  variant: "danger" | "warning";
  children: React.ReactNode;
  screenWidth: number;
  href?: Href;
  onPress?: () => void;
}) {
  const bgColor = variant === "danger" ? "bg-destructive" : "bg-bright";
  const textColor = variant === "danger" ? "text-destructive-foreground" : "text-bright-foreground";
  const cardWidth = screenWidth - 48; // 48 = padding (24 * 2)

  const content = (
    <TouchableOpacity
      className={`flex flex-row items-center gap-2 rounded-xl p-6 shadow-sm ${bgColor}`}
      onPress={onPress}
    >
      <Icon size={24} className={textColor} />
      <Text className={`text-md font-semibold ${textColor}`}>{children}</Text>
    </TouchableOpacity>
  );

  return (
    <Animated.View style={{ width: cardWidth }} className="mr-5">
      {href ? (
        <Link asChild href={href}>
          {content}
        </Link>
      ) : (
        content
      )}
    </Animated.View>
  );
}

export function DashboardAlerts({ mailboxSlug }: { mailboxSlug: string }) {
  const { width: screenWidth } = useWindowDimensions();
  const scrollHandler = useAnimatedScrollHandler({});
  const { data, isLoading } = api.mailbox.conversations.alertCounts.useQuery({ mailboxSlug });
  const settingsUrl = useAuthenticatedUrl(`/mailboxes/${mailboxSlug}/settings?tab=integrations`);
  const openSettings = async () => {
    console.log("settingsUrl", settingsUrl);
    if (settingsUrl) {
      await WebBrowser.openBrowserAsync(settingsUrl());
    }
  };

  if (isLoading || !data) {
    return (
      <View className="px-6">
        <View className="h-20 flex flex-row items-center gap-2 rounded-xl shadow-sm bg-muted" />
      </View>
    );
  }

  const alerts = [
    !data.hasConversations
      ? {
          key: "no-conversations",
          icon: InformationCircleIcon,
          variant: "warning" as const,
          children: "Link Gmail to start managing tickets",
          onPress: openSettings,
        }
      : null,
    data.assignedToMe > 0
      ? {
          key: "assigned",
          icon: UserIcon,
          variant: "danger" as const,
          children: `${data.assignedToMe} open ${data.assignedToMe === 1 ? "ticket is" : "tickets are"} assigned to you`,
          href: { pathname: "/conversations", params: { category: "mine", mailboxSlug } } satisfies Href,
        }
      : null,
    data.vipOverdue > 0
      ? {
          key: "vip",
          icon: StarIcon,
          variant: "warning" as const,
          children: `${data.vipOverdue} ${data.vipOverdue === 1 ? "VIP has" : "VIPs have"} been waiting ${formatHours(
            data.vipExpectedResponseHours ?? 0,
          )}`,
          href: { pathname: "/conversations", params: { category: "all", mailboxSlug } } satisfies Href,
        }
      : null,
  ].flatMap((alert) => (alert ? [alert] : []));

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Animated.ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      decelerationRate="fast"
      className="w-full px-6"
    >
      {alerts.map((alert) => (
        <AlertCard {...alert} key={alert.key} screenWidth={screenWidth} />
      ))}
    </Animated.ScrollView>
  );
}

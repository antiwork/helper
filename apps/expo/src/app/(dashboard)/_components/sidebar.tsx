import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import {
  ArrowRightOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CheckIcon,
  InboxIcon,
  UserCircleIcon,
} from "react-native-heroicons/outline";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useMailbox } from "@/components/mailboxContext";
import { Avatar } from "@/components/ui/avatar";
import { useAuthenticatedUrl } from "@/components/useGenerateUrl";
import { api } from "@/utils/api";
import { cn, cssIconInterop } from "@/utils/css";

cssIconInterop(CheckIcon);
cssIconInterop(ArrowTopRightOnSquareIcon);
cssIconInterop(UserCircleIcon);
cssIconInterop(ArrowRightOnRectangleIcon);
cssIconInterop(ChartBarIcon);
cssIconInterop(InboxIcon);

export function Sidebar({ navigation }: { navigation: { closeDrawer: () => void } }) {
  const { selectedMailbox, setSelectedMailbox } = useMailbox();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const router = useRouter();
  const url = useAuthenticatedUrl("/mailboxes");

  const handleLogout = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  const openOnWeb = async () => {
    if (selectedMailbox && url) {
      await Linking.openURL(url());
    }
  };

  const openProfile = () => {
    router.push("/profile");
  };

  if (!mailboxes?.length) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom", "left"]} style={{ height: "100%", paddingBottom: 16 }}>
        <Text className="px-6 py-4 text-sm uppercase font-semibold text-foreground">Mailboxes</Text>
        {mailboxes.map((mailbox) => (
          <React.Fragment key={mailbox.slug}>
            <TouchableOpacity
              onPress={() => {
                setSelectedMailbox(mailbox.slug);
                router.push("/");
                navigation.closeDrawer();
              }}
              className="flex-row items-center px-6 py-4"
            >
              <View className="mr-3">
                <Avatar name={mailbox.name} />
              </View>
              <Text
                className={cn("flex-1 text-lg text-foreground", selectedMailbox?.slug === mailbox.slug && "font-bold")}
              >
                {mailbox.name}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}

        <View className="my-4 border-b border-border" />
        <TouchableOpacity onPress={openOnWeb} className="px-6 py-4 flex-row items-center">
          <ArrowTopRightOnSquareIcon className="mr-3 h-5 w-5 text-foreground" />
          <Text className="text-foreground">More</Text>
        </TouchableOpacity>

        <Text className="mt-auto px-6 py-4 text-sm uppercase font-semibold text-foreground">
          {user?.fullName ?? "User"}
        </Text>
        <TouchableOpacity onPress={openProfile} className="px-6 py-4">
          <View className="flex-row items-center">
            <UserCircleIcon className="mr-3 h-5 w-5 text-foreground" />
            <Text className="text-foreground">Account settings</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} className="px-6 py-4">
          <View className="flex-row items-center">
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-foreground" />
            <Text className="text-foreground">Logout</Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

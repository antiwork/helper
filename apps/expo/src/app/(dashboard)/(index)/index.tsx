import React, { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMailbox } from "@/components/mailboxContext";
import { api } from "@/utils/api";
import { DashboardAlerts } from "../_components/dashboardAlerts";
import { Header } from "../_components/header";
import { PeopleTable } from "../_components/peopleTable";
import { ReactionsChart } from "../_components/reactionsChart";
import { StatusByTypeChart } from "../_components/statusByTypeChart";
import { TabBar } from "../_components/tabBar";
import { TimeRange, TimeRangeSelector } from "../_components/timeRangeSelector";

export default function DashboardScreen() {
  const { selectedMailbox } = useMailbox();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [refreshing, setRefreshing] = useState(false);
  const utils = api.useUtils();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await utils.invalidate();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <View className="py-3">
        <Header />
      </View>
      <View className="flex-1">
        <ScrollView
          className="pt-3 flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {selectedMailbox && (
            <>
              <DashboardAlerts mailboxSlug={selectedMailbox.slug} />

              <View className="mt-6 px-6 flex-row justify-end items-center">
                <TimeRangeSelector value={timeRange} onValueChange={setTimeRange} />
              </View>

              <View className="mb-16">
                <StatusByTypeChart mailboxSlug={selectedMailbox.slug} timeRange={timeRange} />
                <PeopleTable mailboxSlug={selectedMailbox.slug} timeRange={timeRange} />
                <ReactionsChart mailboxSlug={selectedMailbox.slug} timeRange={timeRange} />
              </View>
            </>
          )}
        </ScrollView>
      </View>
      <TabBar />
    </SafeAreaView>
  );
}

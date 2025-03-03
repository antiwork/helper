"use client";

import { UserButton } from "@clerk/nextjs";
import { ReactNode, useState } from "react";
import { ReactionsChart } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/dashboard/_components/reactionsChart";
import { PeopleTable } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/members/_components/peopleTable";
import { PageContent } from "@/components/pageContent";
import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";
import { DashboardAlerts } from "./dashboardAlerts";
import { StatusByTypeChart } from "./statusByTypeChart";
import { TimeRangeSelector } from "./timeRangeSelector";
import { ViewSwitcher } from "./viewSwitcher";

export type TimeRange = "24h" | "custom" | "7d" | "30d" | "1y";

type Props = {
  mailboxSlug: string;
  currentMailbox: { name: string; slug: string };
};

export function DashboardContent({ mailboxSlug, currentMailbox }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customDate, setCustomDate] = useState<Date>();

  return (
    <div>
      <div className="bg-sidebar text-white px-4 flex items-center border-b border-white/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <div className="py-1">
              <ViewSwitcher mailboxSlug={mailboxSlug} />
            </div>
          </div>
        </div>
        <div className="ml-auto py-1">
          <UserButton />
        </div>
      </div>

      <DashboardAlerts mailboxSlug={mailboxSlug} />

      <PageContent className="bg-sidebar">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="scroll-m-20 text-4xl font-sundry-bold text-white tracking-tight">At a glance</h3>
            <TimeRangeSelector
              value={timeRange}
              onValueChange={(value) => {
                setTimeRange(value);
                if (value !== "custom") {
                  setCustomDate(undefined);
                }
              }}
              customDate={customDate}
              onCustomDateChange={setCustomDate}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Panel className="h-[800px] md:h-[400px] md:col-span-2">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <h4 className="scroll-m-20 mb-2 text-sm font-semibold tracking-tight uppercase">Ticket Status</h4>
                  <StatusByTypeChart mailboxSlug={mailboxSlug} timeRange={timeRange} customDate={customDate} />
                </div>
                <div className="flex flex-col">
                  <h4 className="scroll-m-20 mb-2 text-sm font-semibold tracking-tight uppercase">Replies by Agent</h4>
                  <PeopleTable mailboxSlug={mailboxSlug} timeRange={timeRange} customDate={customDate} />
                </div>
              </div>
            </Panel>
            <Panel title="Reactions" className="h-[400px]">
              <ReactionsChart mailboxSlug={mailboxSlug} timeRange={timeRange} customDate={customDate} />
            </Panel>
          </div>
        </div>
      </PageContent>
    </div>
  );
}

"use client";

import { Calendar, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";

const dayOptions = [
  { value: 1, label: "Today" },
  { value: 7, label: "This week" },
  { value: 30, label: "This month" },
  { value: 90, label: "Three months" },
];

export default function StatsPage() {
  const [selectedDays, setSelectedDays] = useState(7);

  const { data: openCounts } = api.mailbox.openCount.useQuery();
  const { data: leaderboardData } = api.mailbox.leaderboard.useQuery({ days: selectedDays });

  const getCurrentTimeframeLabel = () => {
    const option = dayOptions.find((opt) => opt.value === selectedDays);
    return option ? option.label : "This week";
  };

  return (
    <div className="min-h-screen bg-[hsl(0_58%_10%)] text-white -m-8 p-8 relative">
      {/* Helper Logo in top left corner */}
      <div className="absolute top-8 left-8 z-10">
        <Link href="/mine">
          <Image src="/logo-white.svg" alt="Helper" width={120} height={32} className="cursor-pointer" />
        </Link>
      </div>

      <main className="space-y-8 max-w-screen-lg mx-auto" data-testid="stats-main-content">
        <div className="text-center">
          {/* Centered Calendar Icon with Dropdown - Replaces Ticket Dashboard title */}
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="flex items-center gap-4 cursor-pointer group-hover:underline decoration-white decoration-2 underline-offset-4">
                <Calendar className="h-8 w-8 text-white" />
                <span className="text-5xl font-semibold text-white" data-testid="timeframe-label">
                  {getCurrentTimeframeLabel()}
                </span>
                <ChevronDown className="h-6 w-6 text-white transition-transform group-hover:rotate-180" />
              </div>

              {/* Dropdown Menu */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-[hsl(0_20%_22%)] border border-white/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-[200px]">
                {dayOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDays(option.value)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                      selectedDays === option.value ? "bg-white/20 text-yellow-400" : "text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6" data-testid="metrics-grid">
          <Card className="text-center bg-[#331111] border-none text-white" data-testid="metric-card-all-open">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-100">All Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-8xl font-bold text-bright" data-testid="metric-value-all-open">
                {openCounts?.all ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-[#331111] border-none text-white" data-testid="metric-card-assigned">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-100">Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-8xl font-bold text-[#459EFD]" data-testid="metric-value-assigned">
                {openCounts?.assigned ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-[#331111] border-none text-white" data-testid="metric-card-unassigned">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-100">Unassigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-8xl font-bold text-[#FF4343]" data-testid="metric-value-unassigned">
                {openCounts?.unassigned ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card className="text-center bg-[#331111] border-none text-white" data-testid="metric-card-mine">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-100">Mine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-8xl font-bold text-[#FF90E8]" data-testid="metric-value-mine">
                {openCounts?.mine ?? 0}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4" data-testid="leaderboard-section">
          {leaderboardData?.leaderboard.map((member, index) => (
            <div
              key={member.userId}
              data-testid="leaderboard-entry"
              className={`flex items-center justify-between px-6 py-4 rounded-lg ${
                index === 0 ? "bg-bright text-[hsl(0_58%_10%)]" : "bg-[#331111] text-bright"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-16">
                  <div className={`font-bold ${index === 0 ? "text-[hsl(0_58%_10%)]" : "text-bg-bright"}`}>
                    {index === 0 ? (
                      <Image
                        src="/images/1st-place-medal.png"
                        alt="1st Place"
                        width={124}
                        height={124}
                        className="-translate-y-2 scale-125"
                      />
                    ) : (
                      <span className="text-4xl">#{index + 1}</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className={`text-2xl font-semibold ${index === 0 ? "text-[hsl(0_58%_10%)]" : "text-amber-100"}`}>
                    {member.displayName}
                  </div>
                </div>
              </div>
              <div className={`text-5xl font-bold ${index === 0 ? "text-[hsl(0_58%_10%)]" : "text-amber-100"}`}>
                {member.replyCount}
              </div>
            </div>
          ))}
          {!leaderboardData?.leaderboard.length && (
            <div className="text-center text-2xl text-white/70 py-12">No activity in the selected time period</div>
          )}
        </section>
      </main>
    </div>
  );
}

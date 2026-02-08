"use client";

import { useState, useEffect } from "react";
import { Users, Crown, Activity, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    premiumUsers: number;
    activeToday: number;
  };
  recentEvents: {
    id: string;
    eventType: string;
    eventName: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    userId: string | null;
  }[];
  eventsByType: {
    eventType: string;
    count: number;
  }[];
  dailyActiveUsers: {
    date: string;
    count: number;
  }[];
  subscriptionStats: {
    membership: string;
    count: number;
  }[];
  featureUsage: {
    eventName: string;
    count: number;
  }[];
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
          Skúsiť znova
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // Calculate conversion rate
  const conversionRate =
    data.overview.totalUsers > 0
      ? ((data.overview.premiumUsers / data.overview.totalUsers) * 100).toFixed(
          1,
        )
      : "0";

  // Get max value for bar chart scaling
  const maxDailyUsers = Math.max(
    ...data.dailyActiveUsers.map((d) => d.count),
    1,
  );

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics (posledných 30 dní)</h2>
        <Button
          onClick={fetchAnalytics}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Obnoviť
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Celkom userov</p>
              <p className="text-2xl font-bold">{data.overview.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Premium userov</p>
              <p className="text-2xl font-bold">{data.overview.premiumUsers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktívni dnes</p>
              <p className="text-2xl font-bold">{data.overview.activeToday}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5">
              <TrendingUp className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Konverzia</p>
              <p className="text-2xl font-bold">{conversionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Active Users Chart */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Denní aktívni používatelia</h3>
          <div className="flex h-48 items-end gap-1">
            {data.dailyActiveUsers.slice(-14).map((day, i) => (
              <div
                key={i}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${day.date}: ${day.count} users`}
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-violet-500 to-violet-400 transition-all hover:from-violet-600 hover:to-violet-500"
                  style={{
                    height: `${(day.count / maxDailyUsers) * 100}%`,
                    minHeight: day.count > 0 ? "4px" : "0px",
                  }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(day.date).getDate()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Rozdelenie predplatného</h3>
          <div className="space-y-3">
            {data.subscriptionStats.map((stat) => {
              const percentage = data.overview.totalUsers
                ? ((stat.count / data.overview.totalUsers) * 100).toFixed(1)
                : "0";
              const colors: Record<string, string> = {
                basic: "bg-gray-400",
                premium: "bg-amber-500",
                pro: "bg-violet-500",
                trainer: "bg-emerald-500",
              };
              return (
                <div key={stat.membership} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{stat.membership}</span>
                    <span className="text-muted-foreground">
                      {stat.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full ${colors[stat.membership] || "bg-gray-400"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Používanie funkcií</h3>
        {data.featureUsage.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.featureUsage.map((feature) => (
              <div
                key={feature.eventName}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
              >
                <span className="text-sm">
                  {feature.eventName.replace(/_/g, " ")}
                </span>
                <span className="font-semibold text-violet-600">
                  {feature.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Zatiaľ žiadne dáta
          </p>
        )}
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Posledné udalosti</h3>
        {data.recentEvents.length > 0 ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Udalosť</th>
                  <th className="pb-2 font-medium">Čas</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.slice(0, 20).map((event) => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          event.eventType === "auth"
                            ? "bg-blue-100 text-blue-700"
                            : event.eventType === "feature"
                              ? "bg-green-100 text-green-700"
                              : event.eventType === "subscription"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {event.eventType}
                      </span>
                    </td>
                    <td className="py-2">{event.eventName}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString("sk-SK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Zatiaľ žiadne udalosti
          </p>
        )}
      </div>
    </div>
  );
}

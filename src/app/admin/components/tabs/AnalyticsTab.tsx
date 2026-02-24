"use client";

import { useState, useEffect } from "react";
import { Users, Crown, Activity, RefreshCw, TrendingUp, MessageCircle, X, Eye, ChevronDown, ChevronUp } from "lucide-react";
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
    userFullName?: string | null;
  }[];
  eventsByType: {
    eventType: string;
    count: number;
  }[];
  componentInteractions: {
    id: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    userFullName: string | null;
  }[];
  recentAiInsights: {
    id: string;
    insightType: string;
    title: string;
    generatedAt: string | null;
    userFullName: string | null;
  }[];
  dailyActiveUsers: {
    date: string;
    count: number;
    activeUsers: string[] | null;
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

interface ChatAnalyticsData {
  overview: {
    totalMessages: number;
    totalSessions: number;
    uniqueUsers: number;
    messagestoday: number;
  };
  dailyMessages: {
    date: string;
    messageCount: number;
    sessionCount: number;
    uniqueUsers: number;
  }[];
  topUsers: {
    userProfileId: string;
    fullName: string | null;
    messageCount: number;
    sessionCount: number;
    lastActive: string;
  }[];
  recentSessions: {
    sessionId: string;
    userProfileId: string;
    fullName: string | null;
    messageCount: number;
    firstMessage: string;
    lastMessage: string;
    startedAt: string;
  }[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent: string | null;
  createdAt: string;
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [chatData, setChatData] = useState<ChatAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInteraction, setExpandedInteraction] = useState<string | null>(
    null,
  );
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [viewingSession, setViewingSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatUsersExpanded, setChatUsersExpanded] = useState(false);

  const eventNameTranslations: Record<string, string> = {
    login: "Prihlásenie",
    signup: "Vytvorenie používateľa",
    logout: "Odhlásenie",
    shopping_list_created: "Vytvorenie nákupného zoznamu",
    shopping_list_viewed: "Zobrazenie nákupného zoznamu",
    shopping_list_downloaded: "Stiahnutie nákupného zoznamu",
    meal_plan_generated: "Generovanie jedálnička",
    upgrade: "Upgrade predplatného",
    downgrade: "Zmena predplatného nadol",
    cancel: "Zrušenie predplatného",
    onboarding_complete: "Dokončenie onboardingu",
    push_subscribed: "Aktivácia notifikácií",
  };

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

  const fetchChatAnalytics = async () => {
    setIsChatLoading(true);
    try {
      const response = await fetch("/api/admin/chat-analytics");
      if (!response.ok) throw new Error("Failed to fetch chat analytics");
      const result = await response.json();
      setChatData(result);
    } catch (err) {
      console.error("Chat analytics error:", err);
    } finally {
      setIsChatLoading(false);
    }
  };

  const fetchSessionMessages = async (sessionId: string) => {
    setIsLoadingMessages(true);
    setViewingSession(sessionId);
    try {
      const response = await fetch(`/api/admin/chat-analytics?sessionId=${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const result = await response.json();
      setSessionMessages(result.messages || []);
    } catch (err) {
      console.error("Session messages error:", err);
      setSessionMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchChatAnalytics();
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

      {/* Top Level: Last 3 Days Login Ratio */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-center font-semibold">
          Aktivita používateľov (Posledné 3 dni)
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {data.dailyActiveUsers.slice(-3).map((day) => {
            const ratio =
              data.overview.totalUsers > 0
                ? (day.count / data.overview.totalUsers) * 100
                : 0;
            const isGood = ratio > 20;
            const strokeColor = isGood ? "#22c55e" : "#ef4444"; // green-500 : red-500
            const bgColor = isGood ? "#dcfce7" : "#fee2e2"; // green-100 : red-100

            // SVG Circle stuff
            const size = 120;
            const strokeWidth = 10;
            const center = size / 2;
            const radius = center - strokeWidth;
            const circumference = 2 * Math.PI * radius;
            // Cap at 100% for the visual arc
            const strokeDashoffset =
              circumference - (Math.min(ratio, 100) / 100) * circumference;

            return (
              <div key={day.date} className="flex flex-col items-center gap-2">
                <div className="relative" style={{ width: size, height: size }}>
                  {/* Background Circle */}
                  <svg
                    className="absolute top-0 left-0 -rotate-90 transform"
                    width={size}
                    height={size}
                  >
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={bgColor}
                      strokeWidth={strokeWidth}
                    />
                    {/* Foreground Circle */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="transparent"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className={`text-2xl font-bold ${isGood ? "text-green-600" : "text-red-500"}`}
                    >
                      {ratio.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {day.count} / {data.overview.totalUsers}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {new Date(day.date).toLocaleDateString("sk-SK", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            );
          })}
        </div>
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
          <div className="relative">
            <div className="flex h-48 items-end gap-1">
              {data.dailyActiveUsers.slice(-14).map((day, i) => (
                <div
                  key={i}
                  className={`flex flex-1 flex-col items-center gap-1 cursor-pointer group ${selectedBarIndex === i ? "z-10" : ""}`}
                  onClick={() => setSelectedBarIndex(selectedBarIndex === i ? null : i)}
                >
                  <span className="text-[10px] font-bold text-violet-600 mb-0.5">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all ${selectedBarIndex === i ? "bg-gradient-to-t from-violet-600 to-violet-500 ring-2 ring-violet-300" : "bg-gradient-to-t from-violet-500 to-violet-400 group-hover:from-violet-600 group-hover:to-violet-500"}`}
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
            {/* Click-based popover for selected bar */}
            {selectedBarIndex !== null && (() => {
              const day = data.dailyActiveUsers.slice(-14)[selectedBarIndex];
              if (!day) return null;
              return (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl shadow-xl bg-white/95 backdrop-blur-md border border-gray-100 p-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <span className="font-semibold text-sm">
                      {new Date(day.date).toLocaleDateString("sk-SK", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-full text-xs">
                        {day.count} <Users className="inline w-3 h-3 ml-0.5" />
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedBarIndex(null); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {day.activeUsers && day.activeUsers.length > 0 ? (
                    <ul className="max-h-32 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                      {day.activeUsers.map((name, idx) => (
                        <li
                          key={idx}
                          className="truncate text-xs text-gray-600 flex items-center gap-1.5"
                        >
                          <div className="w-1 h-1 rounded-full bg-green-500" />
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      Žiadni používatelia
                    </p>
                  )}
                </div>
              );
            })()}
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
        <h3 className="mb-4 font-semibold">Rozdelenie akcií používateľov</h3>
        {data.featureUsage.length > 0 ? (
          <div className="space-y-4">
            {(() => {
              const totalEvents = data.featureUsage.reduce(
                (sum, f) => sum + Number(f.count),
                0,
              );
              return data.featureUsage.map((feature) => {
                const percentage =
                  totalEvents > 0
                    ? ((Number(feature.count) / totalEvents) * 100).toFixed(1)
                    : "0";
                return (
                  <div key={feature.eventName} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {eventNameTranslations[feature.eventName] ||
                          feature.eventName.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {feature.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
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
                  <th className="pb-2 font-medium">Používateľ</th>
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Udalosť</th>
                  <th className="pb-2 font-medium">Čas</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEvents.slice(0, 20).map((event) => (
                  <tr key={event.id} className="border-b border-gray-100">
                    <td className="py-2">
                      <span className="font-medium text-gray-900">
                        {event.userFullName || "Neznámy"}
                      </span>
                    </td>
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
                    <td className="py-2">
                      {eventNameTranslations[event.eventName] ||
                        event.eventName.replace(/_/g, " ")}
                    </td>
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

      {/* Component Interactions */}
      <div className="rounded-xl border bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold mt-1">
            Interakcie s komponentami (Prehľad)
          </h3>
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            {data.componentInteractions?.length || 0} záznamov
          </span>
        </div>

        {!data.componentInteractions ||
        data.componentInteractions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 italic">
            Zatiaľ žiadne interakcie.
          </p>
        ) : (
          <div className="space-y-4">
            {(() => {
              const totalInteractions = data.componentInteractions.length;

              // Group by componentName
              const grouped = data.componentInteractions.reduce(
                (
                  acc: Record<string, typeof data.componentInteractions>,
                  curr,
                ) => {
                  const name =
                    (curr.metadata?.componentName as string) || "Neznáme";
                  if (!acc[name]) acc[name] = [];
                  acc[name].push(curr);
                  return acc;
                },
                {},
              );

              // Sort by count descending
              const sortedGroups = Object.entries(grouped).sort(
                (a, b) => b[1].length - a[1].length,
              );

              return sortedGroups.map(([componentName, events]) => {
                const percentage =
                  totalInteractions > 0
                    ? ((events.length / totalInteractions) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={componentName}
                    className="border rounded-lg overflow-hidden bg-white shadow-sm transition-all"
                  >
                    {/* Header - Summary */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedInteraction(
                          expandedInteraction === componentName
                            ? null
                            : componentName,
                        )
                      }
                    >
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-gray-900">
                            {componentName}
                          </span>
                          <span className="text-muted-foreground font-medium">
                            {events.length} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedInteraction === componentName && (
                      <div className="border-t bg-gray-50/50 p-0 text-sm animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="max-h-60 overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-100 shadow-sm text-xs text-gray-500 z-10">
                              <tr className="border-b text-left">
                                <th className="px-4 py-3 font-medium">Akcia</th>
                                <th className="px-4 py-3 font-medium">
                                  Používateľ
                                </th>
                                <th className="px-4 py-3 font-medium">
                                  Detaily
                                </th>
                                <th className="px-4 py-3 font-medium text-right">
                                  Čas
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {events.map((event) => (
                                <tr
                                  key={event.id}
                                  className="border-b border-gray-100 hover:bg-white transition-colors"
                                >
                                  <td className="px-4 py-3">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                        event.metadata?.action === "click"
                                          ? "bg-blue-100 text-blue-700"
                                          : event.metadata?.action === "view"
                                            ? "bg-purple-100 text-purple-700"
                                            : event.metadata?.action ===
                                                "submit"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-gray-100 text-gray-700"
                                      }`}
                                    >
                                      {String(
                                        event.metadata?.action || "Unknown",
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-gray-700 text-xs">
                                      {event.userFullName || "Neznámy"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                                    {event.metadata &&
                                    Object.keys(event.metadata).length > 2 ? (
                                      Object.entries(event.metadata)
                                        .filter(
                                          ([key]) =>
                                            key !== "componentName" &&
                                            key !== "action",
                                        )
                                        .map(
                                          ([key, value]) => `${key}: ${value}`,
                                        )
                                        .join(", ")
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground text-right w-24">
                                    {new Date(
                                      event.createdAt,
                                    ).toLocaleTimeString("sk-SK", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* AI Insights */}
      <div className="rounded-xl border bg-white p-5 shadow-sm mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold mt-1">AI Výstupy</h3>
          <span className="rounded-full bg-eatrivo-pink/10 px-2.5 py-0.5 text-xs font-semibold text-eatrivo-pink">
            {data.recentAiInsights?.length || 0} záznamov
          </span>
        </div>

        {!data.recentAiInsights || data.recentAiInsights.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 italic">
            Zatiaľ žiadne AI výstupy.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Názov / Detail</th>
                  <th className="pb-2 font-medium">Používateľ</th>
                  <th className="pb-2 font-medium text-right">
                    Čas Vytvorenia
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentAiInsights.map((insight) => (
                  <tr
                    key={insight.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3">
                      <span className="rounded-md px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-wide">
                        {insight.insightType}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-gray-900">
                        {insight.title}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-gray-700 text-xs">
                        {insight.userFullName || "Neznámy"}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground text-right w-32">
                      {insight.generatedAt
                        ? new Date(insight.generatedAt).toLocaleString(
                            "sk-SK",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Neznámy čas"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ──── Chat with Rivo Analytics ──── */}
      <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-5 shadow-sm mt-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-100 p-2">
              <MessageCircle className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold">Chat s Rivom</h3>
              <p className="text-xs text-muted-foreground">Beta — posledných 30 dní</p>
            </div>
          </div>
          <Button
            onClick={fetchChatAnalytics}
            variant="outline"
            size="sm"
            disabled={isChatLoading}
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isChatLoading ? "animate-spin" : ""}`} />
            Obnoviť
          </Button>
        </div>

        {isChatLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !chatData ? (
          <p className="text-center text-muted-foreground py-8 italic">
            Nie je možné načítať dáta chatu.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Chat overview cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-white p-3.5">
                <p className="text-xs text-muted-foreground">Správy dnes</p>
                <p className="text-xl font-bold text-violet-600">{chatData.overview.messagestoday}</p>
              </div>
              <div className="rounded-lg border bg-white p-3.5">
                <p className="text-xs text-muted-foreground">Správy (30d)</p>
                <p className="text-xl font-bold">{chatData.overview.totalMessages}</p>
              </div>
              <div className="rounded-lg border bg-white p-3.5">
                <p className="text-xs text-muted-foreground">Sessions (30d)</p>
                <p className="text-xl font-bold">{chatData.overview.totalSessions}</p>
              </div>
              <div className="rounded-lg border bg-white p-3.5">
                <p className="text-xs text-muted-foreground">Unikátni useri</p>
                <p className="text-xl font-bold">{chatData.overview.uniqueUsers}</p>
              </div>
            </div>

            {/* Daily messages chart */}
            {chatData.dailyMessages.length > 0 && (
              <div className="rounded-lg border bg-white p-4">
                <h4 className="text-sm font-semibold mb-3">Správy za deň</h4>
                <div className="flex h-36 items-end gap-1">
                  {chatData.dailyMessages.slice(-14).map((day, i) => {
                    const maxMsgs = Math.max(...chatData.dailyMessages.slice(-14).map(d => d.messageCount), 1);
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1 group">
                        <span className="text-[10px] font-bold text-violet-600">
                          {day.messageCount > 0 ? day.messageCount : ""}
                        </span>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-violet-500 to-pink-400 transition-all group-hover:from-violet-600 group-hover:to-pink-500"
                          style={{
                            height: `${(day.messageCount / maxMsgs) * 100}%`,
                            minHeight: day.messageCount > 0 ? "4px" : "0px",
                          }}
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top users */}
            {chatData.topUsers.length > 0 && (
              <div className="rounded-lg border bg-white p-4">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setChatUsersExpanded(!chatUsersExpanded)}
                >
                  <h4 className="text-sm font-semibold">Kto chatoval</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{chatData.topUsers.length} používateľov</span>
                    {chatUsersExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
                {chatUsersExpanded && (
                  <div className="mt-3 max-h-60 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white shadow-sm text-xs text-gray-500">
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Meno</th>
                          <th className="pb-2 font-medium text-center">Správy</th>
                          <th className="pb-2 font-medium text-center">Sessions</th>
                          <th className="pb-2 font-medium text-right">Posledná aktivita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chatData.topUsers.map((user) => (
                          <tr key={user.userProfileId} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 font-medium text-gray-900">{user.fullName || "Neznámy"}</td>
                            <td className="py-2 text-center">
                              <span className="bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-full text-xs">
                                {user.messageCount}
                              </span>
                            </td>
                            <td className="py-2 text-center text-gray-600">{user.sessionCount}</td>
                            <td className="py-2 text-right text-xs text-muted-foreground">
                              {new Date(user.lastActive).toLocaleString("sk-SK", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Recent sessions with view option */}
            {chatData.recentSessions.length > 0 && (
              <div className="rounded-lg border bg-white p-4">
                <h4 className="text-sm font-semibold mb-3">Posledné konverzácie</h4>
                <div className="max-h-80 overflow-auto space-y-2">
                  {chatData.recentSessions.map((session) => (
                    <div key={session.sessionId} className="border rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">{session.fullName || "Neznámy"}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                              {session.messageCount} správ
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {session.firstMessage
                              ? (session.firstMessage.length > 100
                                ? session.firstMessage.slice(0, 100) + "..."
                                : session.firstMessage)
                              : "Žiadna správa"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(session.startedAt).toLocaleString("sk-SK", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-violet-600 hover:bg-violet-50 shrink-0"
                          onClick={() => fetchSessionMessages(session.sessionId)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span className="text-xs">Zobraziť</span>
                        </Button>
                      </div>

                      {/* Inline session viewer */}
                      {viewingSession === session.sessionId && (
                        <div className="mt-3 border-t pt-3 animate-in slide-in-from-top-2 fade-in">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-violet-600">Konverzácia</span>
                            <button
                              onClick={() => { setViewingSession(null); setSessionMessages([]); }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {isLoadingMessages ? (
                            <div className="flex justify-center py-4">
                              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          ) : sessionMessages.length === 0 ? (
                            <p className="text-xs text-gray-500 italic py-2">Žiadne správy</p>
                          ) : (
                            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                              {sessionMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`rounded-lg px-3 py-2 text-sm ${
                                    msg.role === "user"
                                      ? "bg-violet-50 text-gray-900 ml-8"
                                      : "bg-gray-100 text-gray-800 mr-8"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-[10px] font-bold uppercase ${msg.role === "user" ? "text-violet-500" : "text-gray-500"}`}>
                                      {msg.role === "user" ? "Používateľ" : "Rivo"}
                                    </span>
                                    {msg.intent && (
                                      <span className="text-[9px] bg-white/60 text-gray-500 px-1 py-0.5 rounded">
                                        {msg.intent}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-gray-400 ml-auto">
                                      {new Date(msg.createdAt).toLocaleTimeString("sk-SK", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chatData.overview.totalMessages === 0 && (
              <p className="text-center text-muted-foreground py-8 italic">
                Zatiaľ žiadne konverzácie s Rivom.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

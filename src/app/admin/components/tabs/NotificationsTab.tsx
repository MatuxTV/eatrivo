import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bell, Send, CheckCircle2, AlertCircle, Radio, Bug, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { User as UserType } from "../types";

interface NotificationsTabProps {
  users: UserType[];
}

type NotificationType = "motivational" | "meal-plan-reminder";

const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
  description: string;
}[] = [
  {
    value: "motivational",
    label: "Motivačná notifikácia",
    description: "Rotujúce motivačné správy (rovnaké ako cron každé 2 dni)",
  },
  {
    value: "meal-plan-reminder",
    label: "Pripomienka jedálneho plánu",
    description: "Pripomienka na vytvorenie jedálneho plánu na tento týždeň",
  },
];

const MOTIVATIONAL_MESSAGES = {
  sk: [
    {
      title: "🍽️ Ako vyzerá tvoj dnešný jedálniček?",
      body: "Pozri sa na svoje jedlá a naplánuj si deň plný energie!",
    },
    {
      title: "💪 Nezabudni na svoje ciele!",
      body: "Sleduj svoj pokrok a drž sa plánu. Rivo ti pomôže!",
    },
    {
      title: "🥗 Čas na zdravý návyk!",
      body: "Otvor Eatrivo a pozri si svoje jedlá na dnes.",
    },
    {
      title: "📊 Kontrola výživy",
      body: "Ako sa ti darí s kalorickým príjmom? Skontroluj si to!",
    },
    {
      title: "🔥 Pokračuj v skvelej práci!",
      body: "Každý deň sa počíta. Otvor si Eatrivo a naplánuj si jedlá.",
    },
    {
      title: "🍎 Tvoje telo ti poďakuje!",
      body: "Sledovanie stravy je kľúč k úspechu. Pokračuj!",
    },
  ],
  en: [
    {
      title: "🍽️ What does your menu look like today?",
      body: "Check your meals and plan a day full of energy!",
    },
    {
      title: "💪 Don't forget your goals!",
      body: "Track your progress and stick to the plan. Rivo will help!",
    },
    {
      title: "🥗 Time for a healthy habit!",
      body: "Open Eatrivo and check your meals for today.",
    },
    {
      title: "📊 Nutrition check",
      body: "How's your calorie intake going? Check it out!",
    },
    {
      title: "🔥 Keep up the great work!",
      body: "Every day counts. Open Eatrivo and plan your meals.",
    },
    {
      title: "🍎 Your body will thank you!",
      body: "Tracking your diet is the key to success. Keep going!",
    },
  ],
};

const MEAL_PLAN_MESSAGES = {
  sk: {
    title: "📋 Nový týždeň, nový jedálniček!",
    body: "Ešte nemáš jedálny plán na tento týždeň. Nechaj Riva uvariť! 🍳",
  },
  en: {
    title: "📋 New week, new meal plan!",
    body: "You don't have a meal plan for this week yet. Let Rivo cook! 🍳",
  },
};

export default function NotificationsTab({ users }: NotificationsTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [notificationType, setNotificationType] =
    useState<NotificationType>("motivational");
  const [selectedLang, setSelectedLang] = useState<"sk" | "en">("sk");
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // broadcast state
  const [broadcastType, setBroadcastType] = useState<"motivational" | "meal-reminder">("motivational");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // debug state
  const [debugStats, setDebugStats] = useState<{
    totalSubscriptions: number;
    uniqueUsers: number;
    vapidPublicKeyConfigured: boolean;
    vapidPrivateKeyConfigured: boolean;
    adminEmailConfigured: boolean;
  } | null>(null);
  const [debugUserSubs, setDebugUserSubs] = useState<{
    subscriptionCount: number;
    subscriptions: { id: string; userAgent: string | null; endpoint: string | null; hasKeys: boolean; createdAt: string }[];
  } | null>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);
  const [isSendingTestSelf, setIsSendingTestSelf] = useState(false);
  const [debugUserId, setDebugUserId] = useState<string>("");

  const loadDebugStats = async () => {
    setIsLoadingDebug(true);
    try {
      const res = await fetch("/api/push/debug");
      const data = await res.json();
      if (res.ok) setDebugStats(data);
      else toast.error(data.error || "Failed to load debug stats");
    } catch {
      toast.error("Network error loading debug stats");
    } finally {
      setIsLoadingDebug(false);
    }
  };

  const loadUserSubs = async (uid: string) => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/push/debug?userId=${uid}`);
      const data = await res.json();
      if (res.ok) setDebugUserSubs(data);
      else toast.error(data.error || "Failed to load user subs");
    } catch {
      toast.error("Network error loading user subs");
    }
  };

  const handleSendTestSelf = async () => {
    setIsSendingTestSelf(true);
    try {
      const res = await fetch("/api/push/test-self", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || data.error || "Test failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsSendingTestSelf(false);
    }
  };

  useEffect(() => {
    loadDebugStats();
  }, []);

  const getPayload = () => {
    if (notificationType === "meal-plan-reminder") {
      const msg = MEAL_PLAN_MESSAGES[selectedLang];
      return { title: msg.title, body: msg.body, url: "/dashboard" };
    }
    const messages = MOTIVATIONAL_MESSAGES[selectedLang];
    const msg = messages[selectedMessageIndex % messages.length];
    return { title: msg.title, body: msg.body, url: "/dashboard" };
  };

  const currentPayload = getPayload();

  const handleSend = async () => {
    if (!selectedUserId) {
      toast.error("Vyber používateľa");
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          payload: currentPayload,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSendResult({
          success: true,
          message: `Notifikácia odoslaná! (${data.sent} zariadení)`,
        });
        toast.success("Notifikácia bola úspešne odoslaná!");
      } else {
        setSendResult({
          success: false,
          message: data.error || data.message || "Odoslanie zlyhalo",
        });
        toast.error(data.error || "Nepodarilo sa odoslať notifikáciu");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      setSendResult({ success: false, message: "Chyba pri odosielaní" });
      toast.error("Chyba pri odosielaní notifikácie");
    } finally {
      setIsSending(false);
    }
  };

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    setBroadcastResult(null);
    try {
      const response = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: broadcastType }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const detail =
          broadcastType === "motivational"
            ? `Odoslané ${data.successful}/${data.totalUsers} zariadení`
            : `Notifikované: ${data.notified}, preskočené: ${data.skipped}`;
        setBroadcastResult({ success: true, message: detail });
        toast.success("Broadcast odoslaný!");
      } else {
        setBroadcastResult({ success: false, message: data.error || "Broadcast zlyhal" });
        toast.error("Broadcast zlyhal");
      }
    } catch {
      setBroadcastResult({ success: false, message: "Chyba siete" });
      toast.error("Chyba pri odosielaní broadcastu");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <>
    <Card className="border-none shadow-lg bg-eatrivo-light">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Test Push Notifikácie
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Odošli testovaciu push notifikáciu vybranému používateľovi
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
        {/* User selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Používateľ</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Vyber používateľa..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullName || user.name || "Bez mena"} — {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notification type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Typ notifikácie</Label>
          <Select
            value={notificationType}
            onValueChange={(v) => setNotificationType(v as NotificationType)}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {
              NOTIFICATION_TYPES.find((t) => t.value === notificationType)
                ?.description
            }
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Jazyk</Label>
          <Select
            value={selectedLang}
            onValueChange={(v) => setSelectedLang(v as "sk" | "en")}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sk">🇸🇰 Slovenčina</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message selector (motivational only) */}
        {notificationType === "motivational" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Správa</Label>
            <Select
              value={String(selectedMessageIndex)}
              onValueChange={(v) => setSelectedMessageIndex(Number(v))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVATIONAL_MESSAGES[selectedLang].map((msg, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {msg.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Preview */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
            Náhľad notifikácie
          </p>
          <p className="text-sm font-semibold text-gray-900">
            {currentPayload.title}
          </p>
          <p className="text-sm text-gray-600">{currentPayload.body}</p>
          {selectedUser && (
            <p className="text-xs text-gray-400 mt-2">
              → {selectedUser.fullName || selectedUser.email}
            </p>
          )}
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={isSending || !selectedUserId}
          className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white"
        >
          {isSending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Odosiela sa...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Odoslať testovaciu notifikáciu
            </div>
          )}
        </Button>

        {/* Result */}
        {sendResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              sendResult.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {sendResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {sendResult.message}
          </div>
        )}
      </CardContent>
    </Card>

    {/* ── Broadcast to All ───────────────────────────────── */}
    <Card className="border-none shadow-lg bg-eatrivo-light mt-4">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Broadcast na všetkých
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Odošli push notifikáciu všetkým prihláseným používateľom (simulácia cron jobu)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Typ broadcastu</Label>
          <Select
            value={broadcastType}
            onValueChange={(v) => setBroadcastType(v as "motivational" | "meal-reminder")}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="motivational">
                💪 Motivačná — odošle všetkým
              </SelectItem>
              <SelectItem value="meal-reminder">
                📋 Pripomienka plánu — len tým bez plánu tento týždeň
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleBroadcast}
          disabled={isBroadcasting}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isBroadcasting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Odosiela sa broadcast...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Spustiť broadcast
            </div>
          )}
        </Button>

        {broadcastResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              broadcastResult.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {broadcastResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {broadcastResult.message}
          </div>
        )}
      </CardContent>
    </Card>

    {/* ── Debug / Status ──────────────────────────────────── */}
    <Card className="border-none shadow-lg bg-eatrivo-light mt-4">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
            <Bug className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          Debug / Stav systému
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Skontroluj konfiguráciu VAPID kľúčov, databázové subscriptions a otestuj notifikáciu sebe
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">

        {/* Env / DB stats */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Stav servera</span>
          <Button
            size="sm"
            variant="outline"
            onClick={loadDebugStats}
            disabled={isLoadingDebug}
            className="h-8 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingDebug ? "animate-spin" : ""}`} />
            Obnoviť
          </Button>
        </div>

        {debugStats ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">VAPID public key</span>
              <span className={debugStats.vapidPublicKeyConfigured ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {debugStats.vapidPublicKeyConfigured ? "✅ OK" : "❌ MISSING"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">VAPID private key</span>
              <span className={debugStats.vapidPrivateKeyConfigured ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {debugStats.vapidPrivateKeyConfigured ? "✅ OK" : "❌ MISSING"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ADMIN_EMAIL</span>
              <span className={debugStats.adminEmailConfigured ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {debugStats.adminEmailConfigured ? "✅ OK" : "❌ MISSING"}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-gray-500">Subscriptions v DB</span>
              <span className="font-semibold text-gray-800">{debugStats.totalSubscriptions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Unikátnych používateľov</span>
              <span className="font-semibold text-gray-800">{debugStats.uniqueUsers}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">Načítava sa...</div>
        )}

        {/* Per-user subscription lookup */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Subscriptions konkrétneho používateľa</Label>
          <Select
            value={debugUserId}
            onValueChange={(v) => {
              setDebugUserId(v);
              setDebugUserSubs(null);
              loadUserSubs(v);
            }}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Vyber používateľa..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName || u.name || "Bez mena"} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {debugUserSubs && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Počet zariadení</span>
                <span className={debugUserSubs.subscriptionCount > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                  {debugUserSubs.subscriptionCount}
                </span>
              </div>
              {debugUserSubs.subscriptions.map((s, i) => (
                <div key={s.id} className="border-t border-gray-100 pt-2 space-y-1">
                  <div className="text-gray-400">Zariadenie {i + 1}</div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 flex-shrink-0">Endpoint</span>
                    <span className="text-gray-700 truncate max-w-[60%]">{s.endpoint ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kľúče</span>
                    <span className={s.hasKeys ? "text-green-600" : "text-red-600"}>{s.hasKeys ? "✅" : "❌"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">User-agent</span>
                    <span className="text-gray-700 truncate max-w-[60%]">{s.userAgent ?? "—"}</span>
                  </div>
                  <div className="text-gray-400">Pridané: {new Date(s.createdAt).toLocaleString("sk-SK")}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Send test to myself */}
        <div className="border-t border-gray-100 pt-4">
          <Button
            onClick={handleSendTestSelf}
            disabled={isSendingTestSelf}
            variant="outline"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {isSendingTestSelf ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />
                Odosiela sa...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Odoslať test notifikáciu sebe samému
              </div>
            )}
          </Button>
          <p className="text-xs text-gray-400 mt-1 text-center">
            Odošle notifikáciu na tvoj účet — musis byť prihlásený a mať povolené notifikácie
          </p>
        </div>

      </CardContent>
    </Card>
    </>
  );
}

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
import { useLocale, useTranslations } from "next-intl";
import type { User as UserType } from "../types";

interface NotificationsTabProps {
  users: UserType[];
}

type NotificationType = "motivational" | "meal-plan-reminder";

const NOTIFICATION_TYPES: {
  value: NotificationType;
}[] = [
  {
    value: "motivational",
  },
  {
    value: "meal-plan-reminder",
  },
];

const MOTIVATIONAL_MESSAGE_COUNT = 6;

export default function NotificationsTab({ users }: NotificationsTabProps) {
  const t = useTranslations("emails.admin.dashboard.notificationsTab");
  const tCommon = useTranslations("emails.admin.dashboard.common");
  const locale = useLocale();
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
      else toast.error(data.error || t("toasts.loadDebugStatsError"));
    } catch {
      toast.error(t("toasts.loadDebugStatsNetworkError"));
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
      else toast.error(data.error || t("toasts.loadUserSubsError"));
    } catch {
      toast.error(t("toasts.loadUserSubsNetworkError"));
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
        toast.error(data.message || data.error || t("toasts.testFailed"));
      }
    } catch {
      toast.error(t("toasts.networkError"));
    } finally {
      setIsSendingTestSelf(false);
    }
  };

  useEffect(() => {
    loadDebugStats();
  }, []);

  const getPayload = () => {
    if (notificationType === "meal-plan-reminder") {
      return {
        title: t(`payloads.mealPlanReminder.${selectedLang}.title`),
        body: t(`payloads.mealPlanReminder.${selectedLang}.body`),
        url: "/home",
      };
    }
    const messageIndex = (selectedMessageIndex % MOTIVATIONAL_MESSAGE_COUNT) + 1;

    return {
      title: t(`payloads.motivational.${selectedLang}.items.${messageIndex}.title`),
      body: t(`payloads.motivational.${selectedLang}.items.${messageIndex}.body`),
      url: "/home",
    };
  };

  const currentPayload = getPayload();

  const handleSend = async () => {
    if (!selectedUserId) {
      toast.error(t("toasts.selectUser"));
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
          message: t("results.notificationSent", { count: data.sent }),
        });
        toast.success(t("toasts.notificationSent"));
      } else {
        setSendResult({
          success: false,
          message: data.error || data.message || t("results.sendFailed"),
        });
        toast.error(data.error || t("toasts.notificationSendError"));
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      setSendResult({ success: false, message: t("results.sendError") });
      toast.error(t("toasts.notificationSendNetworkError"));
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
            ? t("results.broadcastMotivational", {
                successful: data.successful,
                total: data.totalUsers,
              })
            : t("results.broadcastMealReminder", {
                notified: data.notified,
                skipped: data.skipped,
              });
        setBroadcastResult({ success: true, message: detail });
        toast.success(t("toasts.broadcastSent"));
      } else {
        setBroadcastResult({ success: false, message: data.error || t("results.broadcastFailed") });
        toast.error(t("toasts.broadcastError"));
      }
    } catch {
      setBroadcastResult({ success: false, message: t("results.networkError") });
      toast.error(t("toasts.broadcastNetworkError"));
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
          {t("sections.test.title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("sections.test.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
        {/* User selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("fields.user")}</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={t("fields.userPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.fullName || user.name || tCommon("noName")} — {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notification type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("fields.notificationType")}</Label>
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
                  {type.value === "motivational"
                    ? t("types.motivational.label")
                    : t("types.mealPlanReminder.label")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {notificationType === "motivational"
              ? t("types.motivational.description")
              : t("types.mealPlanReminder.description")}
          </p>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("fields.language")}</Label>
          <Select
            value={selectedLang}
            onValueChange={(v) => setSelectedLang(v as "sk" | "en")}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sk">🇸🇰 {t("languages.sk")}</SelectItem>
              <SelectItem value="en">🇬🇧 {t("languages.en")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message selector (motivational only) */}
        {notificationType === "motivational" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("fields.message")}</Label>
            <Select
              value={String(selectedMessageIndex)}
              onValueChange={(v) => setSelectedMessageIndex(Number(v))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: MOTIVATIONAL_MESSAGE_COUNT }, (_, i) => i + 1).map((itemIndex, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {t(`payloads.motivational.${selectedLang}.items.${itemIndex}.title`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Preview */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
            {t("preview.title")}
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
              {t("actions.sending")}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {t("actions.sendTest")}
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
          {t("sections.broadcast.title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("sections.broadcast.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("fields.broadcastType")}</Label>
          <Select
            value={broadcastType}
            onValueChange={(v) => setBroadcastType(v as "motivational" | "meal-reminder")}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="motivational">
                💪 {t("broadcastTypes.motivational")}
              </SelectItem>
              <SelectItem value="meal-reminder">
                📋 {t("broadcastTypes.mealReminder")}
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
              {t("actions.broadcasting")}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              {t("actions.runBroadcast")}
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
          {t("sections.debug.title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("sections.debug.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">

        {/* Env / DB stats */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("debug.serverStatus")}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={loadDebugStats}
            disabled={isLoadingDebug}
            className="h-8 text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingDebug ? "animate-spin" : ""}`} />
            {t("actions.refresh")}
          </Button>
        </div>

        {debugStats ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("debug.vapidPublicKey")}</span>
              <span className={debugStats.vapidPublicKeyConfigured ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {debugStats.vapidPublicKeyConfigured ? t("debug.ok") : t("debug.missing")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("debug.vapidPrivateKey")}</span>
              <span className={debugStats.vapidPrivateKeyConfigured ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {debugStats.vapidPrivateKeyConfigured ? t("debug.ok") : t("debug.missing")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("debug.adminEmail")}</span>
              <span className={debugStats.adminEmailConfigured ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {debugStats.adminEmailConfigured ? t("debug.ok") : t("debug.missing")}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-gray-500">{t("debug.dbSubscriptions")}</span>
              <span className="font-semibold text-gray-800">{debugStats.totalSubscriptions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("debug.uniqueUsers")}</span>
              <span className="font-semibold text-gray-800">{debugStats.uniqueUsers}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">{t("debug.loading")}</div>
        )}

        {/* Per-user subscription lookup */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("debug.userSubscriptions")}</Label>
          <Select
            value={debugUserId}
            onValueChange={(v) => {
              setDebugUserId(v);
              setDebugUserSubs(null);
              loadUserSubs(v);
            }}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={t("fields.userPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.fullName || u.name || tCommon("noName")} — {u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {debugUserSubs && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">{t("debug.deviceCount")}</span>
                <span className={debugUserSubs.subscriptionCount > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                  {debugUserSubs.subscriptionCount}
                </span>
              </div>
              {debugUserSubs.subscriptions.map((s, i) => (
                <div key={s.id} className="border-t border-gray-100 pt-2 space-y-1">
                  <div className="text-gray-400">{t("debug.device", { index: i + 1 })}</div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500 flex-shrink-0">{t("debug.endpoint")}</span>
                    <span className="text-gray-700 truncate max-w-[60%]">{s.endpoint ?? t("debug.emptyValue")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("debug.keys")}</span>
                    <span className={s.hasKeys ? "text-green-600" : "text-red-600"}>{s.hasKeys ? t("debug.ok") : t("debug.missing")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("debug.userAgent")}</span>
                    <span className="text-gray-700 truncate max-w-[60%]">{s.userAgent ?? t("debug.emptyValue")}</span>
                  </div>
                  <div className="text-gray-400">{t("debug.addedAt", { date: new Date(s.createdAt).toLocaleString(locale === "sk" ? "sk-SK" : "en-GB") })}</div>
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
                {t("actions.sending")}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {t("actions.sendTestToSelf")}
              </div>
            )}
          </Button>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {t("debug.sendToSelfHint")}
          </p>
        </div>

      </CardContent>
    </Card>
    </>
  );
}

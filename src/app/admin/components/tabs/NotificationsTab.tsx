import { useState } from "react";
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
import { Bell, Send, CheckCircle2, AlertCircle } from "lucide-react";
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

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
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
  );
}

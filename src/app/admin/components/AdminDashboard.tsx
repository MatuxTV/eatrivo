"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Users,
  Settings,
  Plus,
  User,
  LayoutDashboard,
  Search,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import "react-markdown-editor-lite/lib/index.css";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import to avoid SSR issues
const MdEditor = dynamic(() => import("react-markdown-editor-lite"), {
  ssr: false,
});

// Initialize markdown parser
const mdParser = new MarkdownIt();

interface User {
  id: string;
  name: string | null;
  email: string;
  membership: string;
  profileId: string | null;
  fullName: string | null;
  username: string | null;
  isProfileComplete: boolean | null;
}

interface ShoppingListFormData {
  title: string;
  description: string;
  weekStartDate: string;
  weekEndDate: string;
  status: "active" | "completed" | "cancelled";
  userId?: string;
  markdownContent: string; // NEW: Markdown content instead of file
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"upload" | "users" | "settings">(
    "upload"
  );
  const [formData, setFormData] = useState<ShoppingListFormData>({
    title: "",
    description: "",
    weekStartDate: "",
    weekEndDate: "",
    status: "active",
    userId: "",
    markdownContent: "", // NEW: Initialize markdown content
  });
  const [isUploading, setIsUploading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch("/api/admin/users");
        if (response.ok) {
          const data = await response.json();
          if (data.users && Array.isArray(data.users)) {
            setUsers(data.users);
          } else {
            console.error("Invalid users data:", data);
            setUsers([]);
          }
        } else {
          toast.error("Nepodarilo sa načítať používateľov");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Chyba pri načítavaní používateľov");
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleInputChange = (
    field: keyof ShoppingListFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMarkdownChange = ({ text }: { text: string }) => {
    setFormData((prev) => ({
      ...prev,
      markdownContent: text,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.markdownContent.trim()) {
      toast.error("Prosím napíšte obsah nákupného zoznamu");
      return;
    }

    if (!formData.title || !formData.weekStartDate || !formData.weekEndDate) {
      toast.error("Prosím vyplňte všetky povinné polia");
      return;
    }

    if (!formData.userId || formData.userId === "0") {
      toast.error("Prosím vyberte používateľa");
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch("/api/admin/shopping-lists/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          weekStartDate: formData.weekStartDate,
          weekEndDate: formData.weekEndDate,
          status: formData.status,
          userProfileId: formData.userId,
          markdownContent: formData.markdownContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      await response.json();
      toast.success("Nákupný zoznam bol úspešne vytvorený!");

      // Reset form
      setFormData({
        title: "",
        description: "",
        weekStartDate: "",
        weekEndDate: "",
        status: "active",
        userId: "",
        markdownContent: "",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Nepodarilo sa vytvoriť nákupný zoznam"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = [
    { id: "upload", label: "Vytvoriť zoznam", icon: Plus },
    { id: "users", label: "Používatelia", icon: Users },
    { id: "settings", label: "Nastavenia", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-eatrivo-purple/10 rounded-xl flex items-center justify-center text-eatrivo-purple">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-gray-500">
                  Správa aplikácie Eatrivo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Beta Verzia
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "text-eatrivo-purple bg-eatrivo-purple/5"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 border border-eatrivo-purple/20 rounded-lg"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <div className="w-8 h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                          <Plus className="w-5 h-5" />
                        </div>
                        Nový nákupný zoznam
                      </CardTitle>
                      <CardDescription>
                        Vytvorte a priraďte nákupný zoznam používateľovi.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                            <FileText className="w-4 h-4 text-eatrivo-purple" />
                            Základné informácie
                          </h3>

                          <div className="grid gap-4">
                            <div>
                              <Label htmlFor="title" className="mb-1.5 block">
                                Názov zoznamu
                              </Label>
                              <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                  handleInputChange("title", e.target.value)
                                }
                                placeholder="Napr. Nákupný zoznam - Týždeň 42"
                                required
                                className="h-11"
                              />
                            </div>

                            <div>
                              <Label
                                htmlFor="description"
                                className="mb-1.5 block"
                              >
                                Popis (voliteľné)
                              </Label>
                              <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                  handleInputChange(
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="Krátky popis zoznamu..."
                                rows={2}
                                className="min-h-[80px]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Timing Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                            <LayoutDashboard className="w-4 h-4 text-eatrivo-purple" />
                            Plánovanie
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label
                                htmlFor="startDate"
                                className="mb-1.5 block"
                              >
                                Začiatok týždňa
                              </Label>
                              <Input
                                id="startDate"
                                type="date"
                                value={formData.weekStartDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "weekStartDate",
                                    e.target.value
                                  )
                                }
                                required
                                className="h-11"
                              />
                            </div>
                            <div>
                              <Label htmlFor="endDate" className="mb-1.5 block">
                                Koniec týždňa
                              </Label>
                              <Input
                                id="endDate"
                                type="date"
                                value={formData.weekEndDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "weekEndDate",
                                    e.target.value
                                  )
                                }
                                required
                                className="h-11"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Assignment Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                            <User className="w-4 h-4 text-eatrivo-purple" />
                            Priradenie
                          </h3>

                          <div>
                            <Label className="mb-1.5 block">Používateľ</Label>
                            {isLoadingUsers ? (
                              <div className="flex items-center gap-3 p-4 text-sm text-gray-500 border border-gray-200 rounded-xl bg-gray-50">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-eatrivo-purple"></div>
                                Načítavajú sa používatelia...
                              </div>
                            ) : (
                              <Select
                                value={formData.userId || ""}
                                onValueChange={(value: string) =>
                                  handleInputChange("userId", value)
                                }
                              >
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Vyberte používateľa" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  <div className="p-2 sticky top-0 bg-white z-10 border-b border-gray-100 mb-1">
                                    <div className="relative">
                                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                      <input
                                        className="w-full pl-8 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-eatrivo-purple"
                                        placeholder="Hľadať..."
                                      />
                                    </div>
                                  </div>
                                  <SelectItem value="0" className="py-3">
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <User className="w-4 h-4" />
                                      <span>Bez priradenia (Test)</span>
                                    </div>
                                  </SelectItem>
                                  {users.map((user) => (
                                    <SelectItem
                                      key={user.id}
                                      value={user.profileId || user.id}
                                      className="py-2"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                          ${
                                            user.membership === "Premium"
                                              ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                              : user.membership === "Basic"
                                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                                              : "bg-gray-400"
                                          }`}
                                        >
                                          {user.fullName?.[0] ||
                                            user.email[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col text-left">
                                          <span className="font-medium text-gray-900">
                                            {user.fullName || "Bez mena"}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {user.email}
                                          </span>
                                        </div>
                                        {user.membership === "Premium" && (
                                          <Sparkles className="w-3 h-3 text-yellow-500 ml-auto" />
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="status" className="mb-1.5 block">
                              Stav zoznamu
                            </Label>
                            <Select
                              value={formData.status}
                              onValueChange={(
                                value: "active" | "completed" | "cancelled"
                              ) => handleInputChange("status", value)}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Vyberte stav" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Aktívny
                                  </div>
                                </SelectItem>
                                <SelectItem value="completed">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Dokončený
                                  </div>
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Zrušený
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Editor Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                            <FileText className="w-4 h-4 text-eatrivo-purple" />
                            Obsah (Markdown)
                          </h3>
                          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-eatrivo-purple/20 focus-within:border-eatrivo-purple transition-all">
                            <MdEditor
                              value={formData.markdownContent}
                              style={{ height: "500px" }}
                              renderHTML={(text) => mdParser.render(text)}
                              onChange={handleMarkdownChange}
                              placeholder="# Nákupný zoznam..."
                            />
                          </div>
                        </div>

                        <div className="pt-4">
                          <Button
                            type="submit"
                            disabled={isUploading}
                            className="w-full h-12 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:from-eatrivo-purple/90 hover:to-eatrivo-pink/90 text-white font-semibold rounded-xl shadow-lg shadow-eatrivo-purple/20 hover:shadow-eatrivo-purple/40 transition-all duration-300"
                          >
                            {isUploading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Vytvára sa...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                Vytvoriť nákupný zoznam
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Stats/Info */}
                <div className="space-y-6">
                  <Card className="border-none shadow-lg bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Prehľad používateľov
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-white/80 text-sm">
                              Celkom používateľov
                            </p>
                            <p className="text-4xl font-bold">{users.length}</p>
                          </div>
                          <div className="bg-white/20 p-2 rounded-lg">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/20">
                          <div className="text-center p-2 bg-white/10 rounded-lg">
                            <p className="text-xs text-white/80">Premium</p>
                            <p className="font-bold">
                              {
                                users.filter(
                                  (u) =>
                                    u.membership?.toLowerCase() === "premium"
                                ).length
                              }
                            </p>
                          </div>
                          <div className="text-center p-2 bg-white/10 rounded-lg">
                            <p className="text-xs text-white/80">Basic</p>
                            <p className="font-bold">
                              {
                                users.filter(
                                  (u) => u.membership?.toLowerCase() === "basic"
                                ).length
                              }
                            </p>
                          </div>
                          <div className="text-center p-2 bg-white/10 rounded-lg">
                            <p className="text-xs text-white/80">Free</p>
                            <p className="font-bold">
                              {
                                users.filter(
                                  (u) => u.membership?.toLowerCase() === "free"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                      <CardTitle className="text-base">Rýchle tipy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-gray-500">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500">
                          1
                        </div>
                        <p>
                          Používajte <strong>Markdown</strong> pre formátovanie
                          zoznamov. Nadpisy vytvoríte pomocou #.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center text-green-500">
                          2
                        </div>
                        <p>
                          Zoznamy priraďujte vždy konkrétnemu používateľovi pre
                          personalizáciu.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Správa používateľov
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Pokročilá správa používateľov, ich profilov a predplatného
                    bude dostupná v nasledujúcej aktualizácii.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-lg">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Settings className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Nastavenia systému
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Globálne nastavenia aplikácie a konfigurácia parametrov budú
                    dostupné čoskoro.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

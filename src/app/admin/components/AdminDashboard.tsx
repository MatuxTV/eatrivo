"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import MarkdownIt from "markdown-it";
import "react-markdown-editor-lite/lib/index.css";

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard - Eatrivo
            </h1>
            <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              BETA
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("upload")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "upload"
                    ? "border-eatrivo-purple text-eatrivo-purple"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Plus className="w-5 h-5 inline mr-2" />
                Vytvoriť nákupný zoznam
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "users"
                    ? "border-eatrivo-purple text-eatrivo-purple"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Users className="w-5 h-5 inline mr-2" />
                Používatelia
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "settings"
                    ? "border-eatrivo-purple text-eatrivo-purple"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Settings className="w-5 h-5 inline mr-2" />
                Nastavenia
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === "upload" && (
          <div className="space-y-6 text-primary-text">
            {/* Main Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Nový nákupný zoznam
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Názov *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="Nákupný zoznam - Týždeň 42"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Popis</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      placeholder="Personalizovaný nákupný zoznam na 7 dní"
                      rows={2}
                    />
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Začiatok týždňa *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.weekStartDate}
                        onChange={(e) =>
                          handleInputChange("weekStartDate", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">Koniec týždňa *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.weekEndDate}
                        onChange={(e) =>
                          handleInputChange("weekEndDate", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <Label htmlFor="status">Stav</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(
                        value: "active" | "completed" | "cancelled"
                      ) => handleInputChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte stav" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktívny</SelectItem>
                        <SelectItem value="completed">Dokončený</SelectItem>
                        <SelectItem value="cancelled">Zrušený</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* User Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Priradiť používateľovi *
                    </Label>
                    {isLoadingUsers ? (
                      <div className="flex items-center gap-3 p-4 text-sm text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-eatrivo-purple"></div>
                        Načítavajú sa používatelia...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={formData.userId || ""}
                          onValueChange={(value: string) =>
                            handleInputChange("userId", value)
                          }
                        >
                          <SelectTrigger className="min-h-[40px] h-auto py-3 bg-secondary-foreground border-gray-200 hover:border-eatrivo-purple transition-colors">
                            <SelectValue
                              placeholder={
                                <div className="flex items-center gap-2 text-gray-500">
                                  <User className="w-4 h-4" />
                                  Vyberte používateľa
                                </div>
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-secondary-foreground border-4 max-h-[300px]">
                            <SelectItem value="0" className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Bez priradenia
                                  </span>
                                  <div className="text-xs text-gray-500">
                                    Zoznam nebude priradený žiadnemu
                                    používateľovi
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                            {users.length > 0 ? (
                              users.map((user) => {
                                const getMembershipColor = (
                                  membership: string
                                ) => {
                                  switch (membership?.toLowerCase()) {
                                    case "premium":
                                      return "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white";
                                    case "basic":
                                      return "bg-gradient-to-r from-blue-400 to-blue-500 text-white";
                                    case "free":
                                      return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
                                    default:
                                      return "bg-gradient-to-r from-green-400 to-green-500 text-white";
                                  }
                                };

                                const getMembershipIcon = (
                                  membership: string
                                ) => {
                                  switch (membership?.toLowerCase()) {
                                    case "premium":
                                      return "👑";
                                    case "basic":
                                      return "⭐";
                                    case "free":
                                      return "👤";
                                    default:
                                      return "✨";
                                  }
                                };

                                return (
                                  <SelectItem
                                    key={user?.id}
                                    value={user?.profileId || user?.id}
                                    className="p-3 bg-secondary-foreground hover:bg-gray-50 cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getMembershipColor(
                                          user?.membership
                                        )}`}
                                      >
                                        {getMembershipIcon(user?.membership)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-900 truncate">
                                            {user?.fullName ||
                                              user?.name ||
                                              "Bez mena"}
                                          </span>
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs font-medium ${getMembershipColor(
                                              user?.membership
                                            )}`}
                                          >
                                            {user?.membership}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                          {user?.email}
                                        </div>
                                        {user?.isProfileComplete && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-xs text-green-600">
                                              Profil kompletný
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })
                            ) : (
                              <SelectItem value="nic" className="p-3">
                                <div className="flex items-center gap-3 text-gray-500">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <span>Žiadni používatelia</span>
                                </div>
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>

                        {/* Enhanced stats and info */}
                        <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>
                              Počet používateľov:{" "}
                              <strong className="text-gray-700">
                                {users.length}
                              </strong>
                            </span>
                          </div>
                          {users.length > 0 && (
                            <div className="flex gap-4">
                              <span>
                                Premium:{" "}
                                {
                                  users.filter(
                                    (u) =>
                                      u.membership?.toLowerCase() === "premium"
                                  ).length
                                }
                              </span>
                              <span>
                                Basic:{" "}
                                {
                                  users.filter(
                                    (u) =>
                                      u.membership?.toLowerCase() === "basic"
                                  ).length
                                }
                              </span>
                              <span>
                                Free:{" "}
                                {
                                  users.filter(
                                    (u) =>
                                      u.membership?.toLowerCase() === "free"
                                  ).length
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Markdown Editor */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Obsah nákupného zoznamu (Markdown) *
                    </Label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <MdEditor
                        value={formData.markdownContent}
                        style={{ height: "500px" }}
                        renderHTML={(text) => mdParser.render(text)}
                        onChange={handleMarkdownChange}
                        placeholder="# Nákupný zoznam

## 🥬 Zelenina
- Paradajky (500g)
- Uhorky (3ks)
- Šalát (1ks)

## 🍎 Ovocie
- Jablká (1kg)
- Banány (6ks)

## 🥩 Mäso a ryby
- Kuracie prsia (600g)
- Losos (400g)"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Tip: Používajte Markdown syntax pre formátovanie.
                      Preview vidíte v pravej časti.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90"
                  >
                    {isUploading ? "Vytvára sa..." : "Vytvoriť nákupný zoznam"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>Správa používateľov</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Správa používateľov bude dostupná v budúcej verzii</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "settings" && (
          <Card>
            <CardHeader>
              <CardTitle>Nastavenia systému</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-8">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nastavenia budú dostupné v budúcej verzii</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

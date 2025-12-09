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
  Plus,
  User,
  LayoutDashboard,
  Search,
  ChevronRight,
  Sparkles,
  Mail,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle2,
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

interface UpdateItem {
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix";
}

interface UpdateEmailFormData {
  version: string;
  updateTitle: string;
  updateDescription: string;
  updates: UpdateItem[];
  testEmail: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"upload" | "users" | "emails">(
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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Email form state
  const [emailFormData, setEmailFormData] = useState<UpdateEmailFormData>({
    version: "",
    updateTitle: "",
    updateDescription: "",
    updates: [{ title: "", description: "", type: "feature" }],
    testEmail: "",
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<{
    success: boolean;
    message: string;
    sent?: number;
    failed?: number;
    errors?: string[];
  } | null>(null);

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
      const response = await fetch("/api/admin/shopping-lists", {
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

      // Send shopping list notification email to user
      const selectedUser = users.find(u => u.profileId === formData.userId || u.id === formData.userId);
      if (selectedUser?.email && selectedUser?.fullName) {
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "shopping-list",
              to: selectedUser.email,
              clientName: selectedUser.fullName,
              shoppingListName: formData.title,
              shoppingListDate: new Date(formData.weekStartDate).toLocaleDateString("sk-SK"),
              dashboardUrl: "https://eatrivo.sk/dashboard",
            }),
          });
        } catch (emailError) {
          console.error("Failed to send shopping list notification:", emailError);
          // Don't block the success flow if email fails
        }
      }

      // Reset only markdown content, keep other fields
      setFormData((prev) => ({
        ...prev,
        markdownContent: "",
      }));
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

  const handleGenerateWithAI = async () => {
    if (!formData.userId || formData.userId === "0") {
      toast.error("Prosím vyberte používateľa pre AI generovanie");
      return;
    }

    setIsGeneratingAI(true);

    try {
      // Fetch user_info from backend
      const userInfoResponse = await fetch(`/api/admin/users/${formData.userId}/info`);
      
      if (!userInfoResponse.ok) {
        const errorData = await userInfoResponse.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${userInfoResponse.status}: Nepodarilo sa načítať informácie o používateľovi`);
      }

      const userInfoData = await userInfoResponse.json();

      if (!userInfoData.userInfo) {
        toast.error("Používateľ nemá vyplnené nutričné informácie. Používateľ musí najprv dokončiť onboarding.");
        setIsGeneratingAI(false);
        return;
      }

      const userInfo = userInfoData.userInfo;

      // Validate required fields from userInfo
      const missingFields = [];
      if (!userInfo.sex) missingFields.push("pohlavie");
      if (!userInfo.dateOfBirth) missingFields.push("dátum narodenia");
      if (!userInfo.height) missingFields.push("výška");
      if (!userInfo.weight) missingFields.push("váha");
      if (!userInfo.activity_level) missingFields.push("úroveň aktivity");
      if (!userInfo.goal) missingFields.push("cieľ");

      if (missingFields.length > 0) {
        toast.error(`Používateľovi chýbajú údaje: ${missingFields.join(", ")}. Prosím, doplňte ich v profile.`);
        setIsGeneratingAI(false);
        return;
      }


      // Call shopping list generation endpoint (only generate, don't save to DB)
      const response = await fetch("/api/admin/shopping-lists/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userInfo: {
            sex: userInfo.sex,
            dateOfBirth: userInfo.dateOfBirth,
            height: userInfo.height,
            weight: userInfo.weight,
            activity_level: userInfo.activity_level,
            goal: userInfo.goal,
            meal_per_day: userInfo.meal_per_day || 3,
            cooking_time_pref: userInfo.cooking_time_pref,
            diet_preferences: userInfo.diet_preferences,
            budget_preference: userInfo.budget_preference || "medium",
            likes: userInfo.likes,
            dislikes: userInfo.dislikes,
            allergies: userInfo.allergies,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: AI generovanie zlyhalo`);
      }

      const result = await response.json();
      
      toast.success("AI úspešne vygenerovalo nákupný zoznam! Skontrolujte a upravte pred uložením.");

      // Update markdown editor with generated content (don't save to DB yet)
      setFormData((prev) => ({
        ...prev,
        markdownContent: result.markdown || result.shoppingList || "",
      }));

    } catch (error) {
      console.error("AI generation error:", error);
      
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error("Chyba siete: Skontrolujte internetové pripojenie");
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Nepodarilo sa vygenerovať nákupný zoznam pomocou AI");
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // const handleTestShoppingListEmail = async () => {
  //   setIsTestingEmail(true);
    
  //   try {
  //     const response = await fetch("/api/send-email", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         type: "shopping-list",
  //         to: "magyar.bb87@gmail.com",
  //         clientName: "Matúš Magyar",
  //         shoppingListName: "Týždenný nákupný zoznam",
  //         shoppingListDate: new Date().toLocaleDateString("sk-SK"),
  //         itemCount: 25,
  //         dashboardUrl: "https://eatrivo.sk/dashboard",
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
  //       throw new Error(errorData.error || "Failed to send email");
  //     }

  //     const result = await response.json();
  //     toast.success("Test shopping list email bol úspešne odoslaný!");
  //     console.log("Email sent:", result);
  //   } catch (error) {
  //     console.error("Error sending test email:", error);
  //     toast.error(
  //       error instanceof Error
  //         ? error.message
  //         : "Nepodarilo sa odoslať test email"
  //     );
  //   } finally {
  //     setIsTestingEmail(false);
  //   }
  // };

  const tabs = [
    { id: "upload", label: "Vytvoriť zoznam", icon: Plus },
    { id: "users", label: "Používatelia", icon: Users },
    { id: "emails", label: "Emaily", icon: Mail },
  ] as const;

  // Email form handlers
  const handleEmailInputChange = (field: keyof UpdateEmailFormData, value: string) => {
    setEmailFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateItemChange = (index: number, field: keyof UpdateItem, value: string) => {
    setEmailFormData((prev) => ({
      ...prev,
      updates: prev.updates.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addUpdateItem = () => {
    setEmailFormData((prev) => ({
      ...prev,
      updates: [...prev.updates, { title: "", description: "", type: "feature" }],
    }));
  };

  const removeUpdateItem = (index: number) => {
    if (emailFormData.updates.length > 1) {
      setEmailFormData((prev) => ({
        ...prev,
        updates: prev.updates.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSendTestEmail = async () => {
    if (!emailFormData.testEmail || !emailFormData.version || !emailFormData.updateTitle) {
      toast.error("Vyplňte verziu, názov aktualizácie a testovací email");
      return;
    }

    setIsSendingEmail(true);
    setEmailSendResult(null);

    try {
      const response = await fetch("/api/admin/send-update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...emailFormData,
          testEmail: emailFormData.testEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      setEmailSendResult({ success: true, message: "Test email odoslaný!", sent: 1 });
      toast.success("Test email bol úspešne odoslaný!");
    } catch (error) {
      setEmailSendResult({ 
        success: false, 
        message: error instanceof Error ? error.message : "Chyba pri odosielaní" 
      });
      toast.error("Nepodarilo sa odoslať test email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendToAll = async () => {
    if (!emailFormData.version || !emailFormData.updateTitle || !emailFormData.updateDescription) {
      toast.error("Vyplňte všetky povinné polia");
      return;
    }

    const validUpdates = emailFormData.updates.filter(u => u.title && u.description);
    if (validUpdates.length === 0) {
      toast.error("Pridajte aspoň jednu aktualizáciu s názvom a popisom");
      return;
    }

    // Confirm before sending to all
    if (!confirm(`Naozaj chcete odoslať update email všetkým ${users.length} používateľom?`)) {
      return;
    }

    setIsSendingEmail(true);
    setEmailSendResult(null);

    try {
      const response = await fetch("/api/admin/send-update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: emailFormData.version,
          updateTitle: emailFormData.updateTitle,
          updateDescription: emailFormData.updateDescription,
          updates: validUpdates,
          sendToAll: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send emails");
      }

      setEmailSendResult({
        success: true,
        message: result.message,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      });
      toast.success(`Emaily odoslané ${result.sent} používateľom!`);
    } catch (error) {
      setEmailSendResult({
        success: false,
        message: error instanceof Error ? error.message : "Chyba pri odosielaní",
      });
      toast.error("Nepodarilo sa odoslať emaily");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-eatrivo-purple/10 rounded-xl flex items-center justify-center text-eatrivo-purple">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">
                  Správa aplikácie Eatrivo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">Beta</span> Verzia
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-full sm:w-fit overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial justify-center sm:justify-start whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-eatrivo-purple bg-eatrivo-purple/5"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
                  <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        Nový nákupný zoznam
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Vytvorte a priraďte nákupný zoznam používateľovi.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
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

                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <Label
                                htmlFor="startDate"
                                className="mb-1.5 block text-xs sm:text-sm"
                              >
                                Začiatok
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
                                className="h-10 sm:h-11 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor="endDate" className="mb-1.5 block text-xs sm:text-sm">
                                Koniec
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
                                className="h-10 sm:h-11 text-sm"
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
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-eatrivo-purple" />
                              Obsah (Markdown)
                            </h3>
                            <Button
                              type="button"
                              onClick={handleGenerateWithAI}
                              disabled={isGeneratingAI || !formData.userId || formData.userId === "0"}
                              className="h-8 sm:h-9 px-3 sm:px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                            >
                              {isGeneratingAI ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  Generuje AI...
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  Generovať AI
                                </div>
                              )}
                            </Button>
                          </div>
                          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-eatrivo-purple/20 focus-within:border-eatrivo-purple transition-all">
                            <MdEditor
                              value={formData.markdownContent}
                              style={{ height: "350px" }}
                              renderHTML={(text) => mdParser.render(text)}
                              onChange={handleMarkdownChange}
                              placeholder="# Nákupný zoznam...&#10;&#10;Alebo kliknite na 'Generovať AI' pre automatické vytvorenie."
                              className="md-editor-mobile"
                            />
                          </div>
                        </div>

                        <div className="pt-2 sm:pt-4">
                          <Button
                            type="submit"
                            disabled={isUploading}
                            className="w-full h-11 sm:h-12 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:from-eatrivo-purple/90 hover:to-eatrivo-pink/90 text-white font-semibold text-sm sm:text-base rounded-xl shadow-lg shadow-eatrivo-purple/20 hover:shadow-eatrivo-purple/40 transition-all duration-300"
                          >
                            {isUploading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Vytvára sa...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="hidden sm:inline">Vytvoriť nákupný zoznam</span>
                                <span className="sm:hidden">Vytvoriť zoznam</span>
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
                <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
                  <Card className="border-none shadow-lg bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -mr-8 sm:-mr-10 -mt-8 sm:-mt-10 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-black/10 rounded-full -ml-8 sm:-ml-10 -mb-8 sm:-mb-10 blur-xl" />

                    <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-2">
                      <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        Prehľad používateľov
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-2 sm:pt-2">
                      <div className="space-y-3 sm:space-y-4 relative z-10">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-white/80 text-xs sm:text-sm">
                              Celkom používateľov
                            </p>
                            <p className="text-3xl sm:text-4xl font-bold">
                              {users.length - users.filter((u) => u.membership?.toLowerCase() === "trainer").length}
                            </p>
                          </div>
                          <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-white/20">
                          <div className="text-center p-1.5 sm:p-2 bg-white/10 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-white/80">Premium</p>
                            <p className="font-bold text-sm sm:text-base">
                              {
                                users.filter(
                                  (u) =>
                                    u.membership?.toLowerCase() === "premium"
                                ).length
                              }
                            </p>
                          </div>
                          <div className="text-center p-1.5 sm:p-2 bg-white/10 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-white/80">Basic</p>
                            <p className="font-bold text-sm sm:text-base">
                              {
                                users.filter(
                                  (u) => u.membership?.toLowerCase() === "basic"
                                ).length
                              }
                            </p>
                          </div>
                          <div className="text-center p-1.5 sm:p-2 bg-white/10 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-white/80">Free</p>
                            <p className="font-bold text-sm sm:text-base">
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

                  <Card className="border-none shadow-md bg-white hidden sm:block">
                    <CardHeader className="p-4 sm:p-6 pb-2">
                      <CardTitle className="text-sm sm:text-base text-eatrivo-black-primary">Rýchle tipy</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-2 space-y-3 sm:space-y-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500 text-xs sm:text-sm">
                          1
                        </div>
                        <p>
                          Používajte <strong>Markdown</strong> pre formátovanie
                          zoznamov.
                        </p>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center text-green-500 text-xs sm:text-sm">
                          2
                        </div>
                        <p>
                          Zoznamy priraďujte konkrétnemu používateľovi.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* <Card className="border-none shadow-md bg-white">
                    <CardHeader>
                      <CardTitle className="text-base text-eatrivo-black-primary">Test Email</CardTitle>
                      <CardDescription className="text-xs">
                        Otestujte shopping list notifikačný email
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={handleTestShoppingListEmail}
                        disabled={isTestingEmail}
                        className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-all duration-200"
                      >
                        {isTestingEmail ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Odosiela sa...
                          </div>
                        ) : (
                          "Odoslať test email"
                        )}
                      </Button>
                    </CardContent>
                  </Card> */}
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
              <Card className="border-none shadow-lg bg-eatrivo-light">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    Zoznam používateľov
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Prehľad registrovaných používateľov
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8 sm:py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-eatrivo-purple/30 border-t-eatrivo-purple rounded-full animate-spin" />
                        <p className="text-xs sm:text-sm text-gray-500">Načítavajú sa používatelia...</p>
                      </div>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                        Žiadni používatelia
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        V systéme ešte nie sú registrovaní žiadni používatelia
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="group p-3 sm:p-4 border border-gray-200 rounded-xl hover:border-eatrivo-purple/30 hover:shadow-md transition-all duration-200 bg-white"
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Avatar */}
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white flex-shrink-0
                              ${
                                user.membership === "premium"
                                  ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                                  : user.membership === "basic"
                                  ? "bg-gradient-to-br from-blue-400 to-blue-600"
                                  : user.membership === "trainer"
                                  ? "bg-gradient-to-br from-green-400 to-green-600"
                                  : "bg-gradient-to-br from-gray-400 to-gray-600"
                              }`}
                            >
                              {user.fullName?.[0] || user.email[0].toUpperCase()}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                    {user.fullName || "Bez mena"}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                                    {user.email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  {user.membership === "premium" && (
                                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
                                  )}
                                  <span
                                    className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full capitalize
                                    ${
                                      user.membership === "premium"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : user.membership === "basic"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {user.membership || "free"}
                                  </span>
                                </div>
                              </div>

                              {/* Details Grid - Hidden on very small screens */}
                              <div className="hidden xs:grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                  <span className="text-gray-500">ID:</span>
                                  <span className="font-mono text-gray-700 truncate">
                                    {user.id.slice(0, 8)}...
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                  <span className="text-gray-500">Profil:</span>
                                  <span
                                    className={`px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium
                                    ${
                                      user.isProfileComplete
                                        ? "bg-green-100 text-green-700"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {user.isProfileComplete ? "OK" : "Neúplný"}
                                  </span>
                                </div>
                                {user.username && (
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs col-span-2">
                                    <span className="text-gray-500">Username:</span>
                                    <span className="text-gray-700">@{user.username}</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
                                <Button
                                  size="sm"
                                  className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 hover:bg-eatrivo-purple hover:text-white hover:border-eatrivo-purple transition-colors"
                                  onClick={() => {
                                    if (user.profileId) {
                                      handleInputChange("userId", user.profileId);
                                      setActiveTab("upload");
                                      toast.success(`Vybraný používateľ: ${user.fullName || user.email}`);
                                    }
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-0.5 sm:mr-1" />
                                  <span className="hidden sm:inline">Vytvoriť</span> zoznam
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 sm:h-8 bg-eatrivo-light text-[10px] sm:text-xs px-2 sm:px-3 text-gray-600 hover:text-eatrivo-purple"
                                  onClick={() => {
                                    navigator.clipboard.writeText(user.email);
                                    toast.success("Email skopírovaný");
                                  }}
                                >
                                  <span className="hidden sm:inline">Kopírovať</span> email
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "emails" && (
            <motion.div
              key="emails"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Left Column - Email Form */}
                <div className="lg:col-span-2">
                  <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        Odoslať Update Email
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Informujte používateľov o nových funkciách a vylepšeniach
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="space-y-6">
                        {/* Version & Title */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                            <Sparkles className="w-4 h-4 text-eatrivo-purple" />
                            Základné informácie
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="version" className="mb-1.5 block text-xs sm:text-sm">
                                Verzia *
                              </Label>
                              <Input
                                id="version"
                                placeholder="napr. 1.2.0"
                                value={emailFormData.version}
                                onChange={(e) => handleEmailInputChange("version", e.target.value)}
                                className="h-10 sm:h-11"
                              />
                            </div>
                            <div>
                              <Label htmlFor="updateTitle" className="mb-1.5 block text-xs sm:text-sm">
                                Názov aktualizácie *
                              </Label>
                              <Input
                                id="updateTitle"
                                placeholder="napr. Nové funkcie pre váš dashboard"
                                value={emailFormData.updateTitle}
                                onChange={(e) => handleEmailInputChange("updateTitle", e.target.value)}
                                className="h-10 sm:h-11"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="updateDescription" className="mb-1.5 block text-xs sm:text-sm">
                              Úvodný text *
                            </Label>
                            <Textarea
                              id="updateDescription"
                              placeholder="Krátky úvodný text pre email..."
                              value={emailFormData.updateDescription}
                              onChange={(e) => handleEmailInputChange("updateDescription", e.target.value)}
                              rows={2}
                              className="min-h-[70px] text-sm"
                            />
                          </div>
                        </div>

                        {/* Updates List */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-eatrivo-purple" />
                              Zoznam zmien
                            </h3>
                            <Button
                              type="button"
                              size="sm"
                              onClick={addUpdateItem}
                              className="h-8 text-xs bg-eatrivo-purple/10 text-eatrivo-purple hover:bg-eatrivo-purple hover:text-white"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Pridať
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {emailFormData.updates.map((update, index) => (
                              <div
                                key={index}
                                className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-gray-500">
                                    Zmena #{index + 1}
                                  </span>
                                  {emailFormData.updates.length > 1 && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removeUpdateItem(index)}
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label className="mb-1 block text-xs text-gray-600">Typ</Label>
                                    <Select
                                      value={update.type}
                                      onValueChange={(value: "feature" | "improvement" | "fix") =>
                                        handleUpdateItemChange(index, "type", value)
                                      }
                                    >
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="feature">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            Novinka
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="improvement">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            Vylepšenie
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="fix">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                            Oprava
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <Label className="mb-1 block text-xs text-gray-600">Názov</Label>
                                    <Input
                                      placeholder="napr. Sledovanie váhy"
                                      value={update.title}
                                      onChange={(e) =>
                                        handleUpdateItemChange(index, "title", e.target.value)
                                      }
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="mb-1 block text-xs text-gray-600">Popis</Label>
                                  <Textarea
                                    placeholder="Stručný popis zmeny..."
                                    value={update.description}
                                    onChange={(e) =>
                                      handleUpdateItemChange(index, "description", e.target.value)
                                    }
                                    rows={2}
                                    className="min-h-[60px] text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Test Email */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-100">
                            <Send className="w-4 h-4 text-eatrivo-purple" />
                            Testovanie
                          </h3>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <Input
                                placeholder="test@email.com"
                                value={emailFormData.testEmail}
                                onChange={(e) => handleEmailInputChange("testEmail", e.target.value)}
                                className="h-10 sm:h-11"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleSendTestEmail}
                              disabled={isSendingEmail}
                              className="h-10 sm:h-11 px-6 bg-gray-900 hover:bg-gray-800 text-white"
                            >
                              {isSendingEmail ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span className="hidden sm:inline">Odosiela sa...</span>
                                </div>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Test email
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Result Message */}
                        {emailSendResult && (
                          <div
                            className={`p-4 rounded-xl flex items-start gap-3 ${
                              emailSendResult.success
                                ? "bg-green-50 border border-green-200"
                                : "bg-red-50 border border-red-200"
                            }`}
                          >
                            {emailSendResult.success ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  emailSendResult.success ? "text-green-800" : "text-red-800"
                                }`}
                              >
                                {emailSendResult.message}
                              </p>
                              {emailSendResult.sent !== undefined && (
                                <p className="text-xs text-green-600 mt-1">
                                  Odoslaných: {emailSendResult.sent}
                                  {emailSendResult.failed ? `, Chýb: ${emailSendResult.failed}` : ""}
                                </p>
                              )}
                              {emailSendResult.errors && emailSendResult.errors.length > 0 && (
                                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                                  <p className="text-xs font-semibold text-red-700 mb-2">Chyby pri odosielaní:</p>
                                  <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                                    {emailSendResult.errors.map((err, idx) => (
                                      <li key={idx} className="truncate">{err}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Send to All Button */}
                        <div className="pt-4 border-t border-gray-100">
                          <Button
                            type="button"
                            onClick={handleSendToAll}
                            disabled={isSendingEmail}
                            className="w-full h-11 sm:h-12 bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:from-eatrivo-purple/90 hover:to-eatrivo-pink/90 text-white font-semibold text-sm sm:text-base rounded-xl shadow-lg shadow-eatrivo-purple/20"
                          >
                            {isSendingEmail ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Odosiela sa všetkým...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Odoslať všetkým používateľom ({users.filter(u => u.membership?.toLowerCase() !== "trainer").length})
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            )}
                          </Button>
                          <p className="text-xs text-gray-500 text-center mt-2">
                            ⚠️ Táto akcia odošle email všetkým používateľom
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Preview & Tips */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Stats Card */}
                  <Card className="border-none shadow-lg bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl" />
                    <CardHeader className="p-4 sm:p-6 pb-2">
                      <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                        Email štatistiky
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-2">
                      <div className="space-y-3 relative z-10">
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-white/80 text-xs sm:text-sm">Príjemcovia</p>
                            <p className="text-3xl sm:text-4xl font-bold">
                              {users.filter(u => u.membership?.toLowerCase() !== "trainer").length}
                            </p>
                          </div>
                          <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20">
                          <div className="text-center p-2 bg-white/10 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-white/80">Premium</p>
                            <p className="font-bold">
                              {users.filter(u => u.membership?.toLowerCase() === "premium").length}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-white/10 rounded-lg">
                            <p className="text-[10px] sm:text-xs text-white/80">Ostatní</p>
                            <p className="font-bold">
                              {users.filter(u => ["basic", "free"].includes(u.membership?.toLowerCase() || "")).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tips Card */}
                  <Card className="border-none shadow-md bg-white hidden sm:block">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm text-eatrivo-black-primary">Tipy pre emaily</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3 text-xs text-gray-500">
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500 text-xs">
                          1
                        </div>
                        <p>
                          Najprv odošlite <strong>test email</strong> na svoju adresu
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center text-green-500 text-xs">
                          2
                        </div>
                        <p>
                          Používajte <strong>jasné názvy</strong> zmien
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-50 flex-shrink-0 flex items-center justify-center text-purple-500 text-xs">
                          3
                        </div>
                        <p>
                          Rozdeľte zmeny podľa <strong>typu</strong> (novinka/vylepšenie/oprava)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

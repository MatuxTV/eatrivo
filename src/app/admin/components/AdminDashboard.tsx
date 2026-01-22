"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Import types
import type {
  User as UserType,
  UserInfo,
  ShoppingListFormData,
  UpdateEmailFormData,
  UpdateItem,
} from "./types";

// Import shared components
import AdminHeader from "./shared/AdminHeader";
import AdminTabs, { type TabId } from "./shared/AdminTabs";

// Import tab components
import UsersTab from "./tabs/UsersTab";
import ProfilesTab from "./tabs/ProfilesTab";
import EmailsTab from "./tabs/EmailsTab";
import ShoppingListTab from "./tabs/ShoppingListTab";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("upload");
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
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Profile tab state
  const [selectedUserForProfile, setSelectedUserForProfile] =
    useState<string>("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(false);

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
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Fetch user info when user is selected
    if (field === "userId" && value && value !== "0") {
      fetchUserInfo(value);
    } else if (field === "userId" && (!value || value === "0")) {
      setUserInfo(null);
    }
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
      const selectedUser = users.find(
        (u) => u.profileId === formData.userId || u.id === formData.userId,
      );
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
              shoppingListDate: new Date(
                formData.weekStartDate,
              ).toLocaleDateString("sk-SK"),
              dashboardUrl: "https://eatrivo.sk/dashboard",
            }),
          });
        } catch (emailError) {
          console.error(
            "Failed to send shopping list notification:",
            emailError,
          );
          // Don't block the success flow if email fails
        }

        // Send push notification
        try {
          await fetch("/api/push/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: selectedUser.id,
              payload: {
                title: "🛒 Nový nákupný zoznam",
                body: `${formData.title} - ${new Date(formData.weekStartDate).toLocaleDateString("sk-SK")}`,
                icon: "/logo/favicon_io/android-chrome-192x192.png",
                badge: "/logo/favicon_io/android-chrome-192x192.png",
                data: {
                  url: "/dashboard",
                  type: "shopping-list",
                },
              },
            }),
          });
        } catch (pushError) {
          console.error("Failed to send push notification:", pushError);
          // Don't block the success flow if push fails
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
          : "Nepodarilo sa vytvoriť nákupný zoznam",
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
      const userInfoResponse = await fetch(
        `/api/admin/users/${formData.userId}/info`,
      );

      if (!userInfoResponse.ok) {
        const errorData = await userInfoResponse
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error ||
            `HTTP ${userInfoResponse.status}: Nepodarilo sa načítať informácie o používateľovi`,
        );
      }

      const userInfoData = await userInfoResponse.json();

      if (!userInfoData.userInfo) {
        toast.error(
          "Používateľ nemá vyplnené nutričné informácie. Používateľ musí najprv dokončiť onboarding.",
        );
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
        toast.error(
          `Používateľovi chýbajú údaje: ${missingFields.join(", ")}. Prosím, doplňte ich v profile.`,
        );
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
            language: userInfo.language,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `HTTP ${response.status}: AI generovanie zlyhalo`,
        );
      }

      const result = await response.json();

      toast.success(
        "AI úspešne vygenerovalo nákupný zoznam! Skontrolujte a upravte pred uložením.",
      );

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

  // Email form handlers
  const handleEmailInputChange = (
    field: keyof UpdateEmailFormData,
    value: string,
  ) => {
    setEmailFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateItemChange = (
    index: number,
    field: keyof UpdateItem,
    value: string,
  ) => {
    setEmailFormData((prev) => ({
      ...prev,
      updates: prev.updates.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addUpdateItem = () => {
    setEmailFormData((prev) => ({
      ...prev,
      updates: [
        ...prev.updates,
        { title: "", description: "", type: "feature" },
      ],
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
    if (
      !emailFormData.testEmail ||
      !emailFormData.version ||
      !emailFormData.updateTitle
    ) {
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

      setEmailSendResult({
        success: true,
        message: "Test email odoslaný!",
        sent: 1,
      });
      toast.success("Test email bol úspešne odoslaný!");
    } catch (error) {
      setEmailSendResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Chyba pri odosielaní",
      });
      toast.error("Nepodarilo sa odoslať test email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendToAll = async () => {
    if (
      !emailFormData.version ||
      !emailFormData.updateTitle ||
      !emailFormData.updateDescription
    ) {
      toast.error("Vyplňte všetky povinné polia");
      return;
    }

    const validUpdates = emailFormData.updates.filter(
      (u) => u.title && u.description,
    );
    if (validUpdates.length === 0) {
      toast.error("Pridajte aspoň jednu aktualizáciu s názvom a popisom");
      return;
    }

    // Confirm before sending to all
    if (
      !confirm(
        `Naozaj chcete odoslať update email všetkým ${users.length} používateľom?`,
      )
    ) {
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
        message:
          error instanceof Error ? error.message : "Chyba pri odosielaní",
      });
      toast.error("Nepodarilo sa odoslať emaily");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Fetch user info for profile tab
  const fetchUserInfo = async (userId: string) => {
    if (!userId || userId === "0") {
      setUserInfo(null);
      return;
    }

    setIsLoadingUserInfo(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/info`);

      if (!response.ok) {
        throw new Error("Nepodarilo sa načítať údaje používateľa");
      }

      const data = await response.json();
      setUserInfo(data.userInfo || null);

      if (!data.userInfo) {
        toast.info("Používateľ nemá vyplnené nutričné informácie");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      toast.error("Chyba pri načítavaní údajov používateľa");
      setUserInfo(null);
    } finally {
      setIsLoadingUserInfo(false);
    }
  };

  // Handle user selection in profiles tab
  const handleProfileUserChange = (userId: string) => {
    setSelectedUserForProfile(userId);
    fetchUserInfo(userId);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AdminHeader />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

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
              <ShoppingListTab
                formData={formData}
                users={users}
                isLoadingUsers={isLoadingUsers}
                userInfo={userInfo}
                isLoadingUserInfo={isLoadingUserInfo}
                isUploading={isUploading}
                isGeneratingAI={isGeneratingAI}
                onInputChange={handleInputChange}
                onMarkdownChange={handleMarkdownChange}
                onSubmit={handleSubmit}
                onGenerateWithAI={handleGenerateWithAI}
              />
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
              <UsersTab
                users={users}
                isLoadingUsers={isLoadingUsers}
                onSelectUser={(userId: string, userName: string) => {
                  handleInputChange("userId", userId);
                  setActiveTab("upload");
                  toast.success(`Vybraný používateľ: ${userName}`);
                }}
              />
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
              <EmailsTab
                users={users}
                emailFormData={emailFormData}
                onEmailInputChange={handleEmailInputChange}
                onUpdateItemChange={handleUpdateItemChange}
                onAddUpdateItem={addUpdateItem}
                onRemoveUpdateItem={removeUpdateItem}
                onSendTestEmail={handleSendTestEmail}
                onSendToAll={handleSendToAll}
                isSendingEmail={isSendingEmail}
                emailSendResult={emailSendResult}
              />
            </motion.div>
          )}

          {activeTab === "profiles" && (
            <motion.div
              key="profiles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              <ProfilesTab
                users={users}
                selectedUserForProfile={selectedUserForProfile}
                onUserChange={handleProfileUserChange}
                userInfo={userInfo}
                isLoadingUserInfo={isLoadingUserInfo}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

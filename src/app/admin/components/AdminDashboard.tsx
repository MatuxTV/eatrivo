"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// Import types
import type {
  User as UserType,
  UpdateEmailFormData,
  UpdateItem,
} from "./types";

// Import shared components
import AdminHeader from "./shared/AdminHeader";
import AdminTabs, { type TabId } from "./shared/AdminTabs";

// Import tab components
import EmailsTab from "./tabs/EmailsTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import NotificationsTab from "./tabs/NotificationsTab";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("analytics");
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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
  //         homeUrl: "https://eatrivo.sk/home",
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

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AdminHeader />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Content */}
        <AnimatePresence mode="wait">
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

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              <AnalyticsTab />
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 sm:space-y-6"
            >
              <NotificationsTab users={users} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

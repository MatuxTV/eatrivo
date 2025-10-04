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
import { Upload, FileText, Users, Settings, Plus, User } from "lucide-react";
import { toast } from "sonner";

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
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
          console.log("API Response:", data);
          if (data.users && Array.isArray(data.users)) {
            setUsers(data.users);
            console.log("Users set successfully:", data.users);
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

  // Debug effect to monitor users state
  useEffect(() => {
    console.log("Users state changed:", users.length, users);
  }, [users]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        toast.success(`Súbor ${file.name} bol vybratý`);
      } else {
        toast.error("Prosím vyberte PDF súbor");
        event.target.value = "";
      }
    }
  };

  const handleInputChange = (field: keyof ShoppingListFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Prosím vyberte PDF súbor");
      return;
    }

    if (!formData.title || !formData.weekStartDate || !formData.weekEndDate) {
      toast.error("Prosím vyplňte všetky povinné polia");
      return;
    }

    setIsUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("title", formData.title);
      uploadFormData.append("description", formData.description);
      uploadFormData.append("weekStartDate", formData.weekStartDate);
      uploadFormData.append("weekEndDate", formData.weekEndDate);
      uploadFormData.append("status", formData.status);
      if (formData.userId) {
        uploadFormData.append("userId", formData.userId);
      }

      const response = await fetch("/api/admin/shopping-lists/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      console.log("Upload successful:", result);
      toast.success("Jedálny plán bol úspešne nahraný!");

      // Reset form
      setFormData({
        title: "",
        description: "",
        weekStartDate: "",
        weekEndDate: "",
        status: "active",
        userId: "",
      });
      setSelectedFile(null);

      // Reset file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Nepodarilo sa nahrať jedálny plán");
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
                <Upload className="w-5 h-5 inline mr-2" />
                Nahrať jedálne plány
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-primary-text">
            {/* Upload Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Nový jedálny plán
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* File Upload */}
                  <div>
                    <Label
                      htmlFor="file-upload"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      PDF súbor *
                    </Label>
                    <div className="relative">
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-eatrivo-purple transition-colors"
                      >
                        <div className="text-center">
                          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            {selectedFile
                              ? selectedFile.name
                              : "Kliknite pre výber PDF súboru"}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title">Názov *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      placeholder="Plán na tento týždeň"
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
                      placeholder="Personalizovaný plán na 7 dní s kalóriovým deficitom"
                      rows={3}
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
                      Priradiť používateľovi (voliteľné)
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
                          <SelectTrigger className="h-16 bg-secondary-foreground border-gray-200 hover:border-eatrivo-purple transition-colors">
                            <SelectValue 
                              placeholder={
                                <div className="flex items-center gap-2 text-gray-500">
                                  <User className="w-4 h-4" />
                                  Vyberte používateľa alebo nechajte prázdne
                                </div>
                              } 
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="bez" className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Bez priradenia</span>
                                  <div className="text-xs text-gray-500">Plán nebude priradený žiadnemu používateľovi</div>
                                </div>
                              </div>
                            </SelectItem>
                            {users.length > 0 ? users.map((user) => {
                              const getMembershipColor = (membership: string) => {
                                switch (membership?.toLowerCase()) {
                                  case 'premium':
                                    return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
                                  case 'basic':
                                    return 'bg-gradient-to-r from-blue-400 to-blue-500 text-white';
                                  case 'free':
                                    return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
                                  default:
                                    return 'bg-gradient-to-r from-green-400 to-green-500 text-white';
                                }
                              };

                              const getMembershipIcon = (membership: string) => {
                                switch (membership?.toLowerCase()) {
                                  case 'premium':
                                    return '👑';
                                  case 'basic':
                                    return '⭐';
                                  case 'free':
                                    return '👤';
                                  default:
                                    return '✨';
                                }
                              };

                              return (
                                <SelectItem
                                  key={user?.id}
                                  value={user?.profileId || user?.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${getMembershipColor(user?.membership)}`}>
                                      {getMembershipIcon(user?.membership)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 truncate">
                                          {user?.fullName || user?.name || "Bez mena"}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMembershipColor(user?.membership)}`}>
                                          {user?.membership}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {user?.email}
                                      </div>
                                      {user?.isProfileComplete && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <span className="text-xs text-green-600">Profil kompletný</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            }) : (
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
                            <span>Počet používateľov: <strong className="text-gray-700">{users.length}</strong></span>
                          </div>
                          {users.length > 0 && (
                            <div className="flex gap-4">
                              <span>Premium: {users.filter(u => u.membership?.toLowerCase() === 'premium').length}</span>
                              <span>Basic: {users.filter(u => u.membership?.toLowerCase() === 'basic').length}</span>
                              <span>Free: {users.filter(u => u.membership?.toLowerCase() === 'free').length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-eatrivo-purple hover:bg-eatrivo-purple/90"
                  >
                    {isUploading ? "Nahráva sa..." : "Nahrať jedálny plán"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Preview/Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Prehľad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center text-gray-500 py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Vyberte súbor a vyplňte formulár pre prehľad</p>
                  </div>
                </div>
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

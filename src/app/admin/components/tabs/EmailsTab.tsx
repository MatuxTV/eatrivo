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
  Mail,
  Send,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type {
  UpdateEmailFormData,
  UpdateItem,
  User as UserType,
} from "../types";

interface EmailsTabProps {
  users: UserType[];
  emailFormData: UpdateEmailFormData;
  onEmailInputChange: (field: keyof UpdateEmailFormData, value: string) => void;
  onUpdateItemChange: (
    index: number,
    field: keyof UpdateItem,
    value: string,
  ) => void;
  onAddUpdateItem: () => void;
  onRemoveUpdateItem: (index: number) => void;
  onSendTestEmail: () => void;
  onSendToAll: () => void;
  isSendingEmail: boolean;
  emailSendResult: {
    success: boolean;
    message: string;
    sent?: number;
    failed?: number;
    errors?: string[];
  } | null;
}

export default function EmailsTab({
  users,
  emailFormData,
  onEmailInputChange,
  onUpdateItemChange,
  onAddUpdateItem,
  onRemoveUpdateItem,
  onSendTestEmail,
  onSendToAll,
  isSendingEmail,
  emailSendResult,
}: EmailsTabProps) {
  return (
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
                    <Label
                      htmlFor="version"
                      className="mb-1.5 block text-xs sm:text-sm"
                    >
                      Verzia *
                    </Label>
                    <Input
                      id="version"
                      placeholder="napr. 1.2.0"
                      value={emailFormData.version}
                      onChange={(e) =>
                        onEmailInputChange("version", e.target.value)
                      }
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="updateTitle"
                      className="mb-1.5 block text-xs sm:text-sm"
                    >
                      Názov aktualizácie *
                    </Label>
                    <Input
                      id="updateTitle"
                      placeholder="napr. Nové funkcie pre váš dashboard"
                      value={emailFormData.updateTitle}
                      onChange={(e) =>
                        onEmailInputChange("updateTitle", e.target.value)
                      }
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="updateDescription"
                    className="mb-1.5 block text-xs sm:text-sm"
                  >
                    Úvodný text *
                  </Label>
                  <Textarea
                    id="updateDescription"
                    placeholder="Krátky úvodný text pre email..."
                    value={emailFormData.updateDescription}
                    onChange={(e) =>
                      onEmailInputChange("updateDescription", e.target.value)
                    }
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
                    onClick={onAddUpdateItem}
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
                            onClick={() => onRemoveUpdateItem(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="mb-1 block text-xs text-gray-600">
                            Typ
                          </Label>
                          <Select
                            value={update.type}
                            onValueChange={(
                              value: "feature" | "improvement" | "fix",
                            ) => onUpdateItemChange(index, "type", value)}
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
                          <Label className="mb-1 block text-xs text-gray-600">
                            Názov
                          </Label>
                          <Input
                            placeholder="napr. Sledovanie váhy"
                            value={update.title}
                            onChange={(e) =>
                              onUpdateItemChange(index, "title", e.target.value)
                            }
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-gray-600">
                          Popis
                        </Label>
                        <Textarea
                          placeholder="Stručný popis zmeny..."
                          value={update.description}
                          onChange={(e) =>
                            onUpdateItemChange(
                              index,
                              "description",
                              e.target.value,
                            )
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
                  Test email
                </h3>
                <div>
                  <Label
                    htmlFor="testEmail"
                    className="mb-1.5 block text-xs sm:text-sm"
                  >
                    Testovacia adresa
                  </Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="vas@email.com"
                    value={emailFormData.testEmail}
                    onChange={(e) =>
                      onEmailInputChange("testEmail", e.target.value)
                    }
                    autoComplete="email"
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              {/* Send Result */}
              {emailSendResult && (
                <div
                  className={
                    "p-4 rounded-lg border " +
                    (emailSendResult.success
                      ? "border-green-600 bg-green-50"
                      : "border-red-600 bg-red-50")
                  }
                >
                  <div className="flex items-start gap-3">
                    {emailSendResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={"text-sm font-semibold mb-1"}>
                        {emailSendResult.success ? "Úspech" : "Chyba"}
                      </h4>
                      <p className={"text-sm"}>{emailSendResult.message}</p>
                      {emailSendResult.sent !== undefined && (
                        <p className="text-xs text-gray-600 mt-2">
                          Odoslaných: {emailSendResult.sent}
                          {emailSendResult.failed !== undefined &&
                            `, Zlyhalo: ${emailSendResult.failed}`}
                        </p>
                      )}
                      {emailSendResult.errors &&
                        emailSendResult.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-red-800">
                              Chyby:
                            </p>
                            <ul className="text-xs text-red-700 list-disc list-inside">
                              {emailSendResult.errors
                                .slice(0, 5)
                                .map((error, i) => (
                                  <li key={i}>{error}</li>
                                ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={onSendTestEmail}
                    disabled={isSendingEmail}
                    className="flex-1 bg-primary-foreground border-2 border-eatrivo-black-primary\80 text-eatrivo-black-primary"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSendingEmail ? "Odosielam..." : "Odoslať test"}
                  </Button>
                  <Button
                    type="button"
                    onClick={onSendToAll}
                    disabled={isSendingEmail}
                    className="flex-1 bg-eatrivo-purple hover:bg-eatrivo-purple/90"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {isSendingEmail ? "Odosielam..." : "Odoslať všetkým"}
                  </Button>
                </div>
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
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {users.length}
                  </p>
                  <p className="text-xs text-white/80">
                    Celkový počet používateľov
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {users.filter((u) => u.email).length}
                  </p>
                  <p className="text-xs text-white/80">S emailom</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20">
                <div>
                  <p className="text-lg font-bold text-white">
                    {users.filter((u) => u.membership === "premium").length}
                  </p>
                  <p className="text-xs text-white/80">Premium</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {users.filter((u) => u.membership === "basic").length}
                  </p>
                  <p className="text-xs text-white/80">Basic</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border-none shadow-md bg-white hidden sm:block">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-eatrivo-black-primary">
              Tipy pre emaily
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3 text-xs text-gray-500">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center text-blue-500 text-xs">
                1
              </div>
              <p>Najprv odošlite test na svoju adresu</p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-green-50 flex-shrink-0 flex items-center justify-center text-green-500 text-xs">
                2
              </div>
              <p>Používajte prehľadný zoznam zmien</p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-50 flex-shrink-0 flex items-center justify-center text-purple-500 text-xs">
                3
              </div>
              <p>Rozdeľte zmeny podľa typu (novinka/vylepšenie/oprava)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

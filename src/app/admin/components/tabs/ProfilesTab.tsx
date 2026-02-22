import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  User,
  UserCircle,
  Calendar,
  Activity,
  Scale,
  Target,
  Heart,
  Clock,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import type {
  User as UserType,
  UserInfo,
  UserShoppingList,
  UserMealPlan,
} from "../types";

interface ProfilesTabProps {
  users: UserType[];
  selectedUserForProfile: string;
  onUserChange: (userId: string) => void;
  userInfo: UserInfo | null;
  isLoadingUserInfo: boolean;
}

export default function ProfilesTab({
  users,
  selectedUserForProfile,
  onUserChange,
  userInfo,
  isLoadingUserInfo,
}: ProfilesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Left Column - User Selection */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-eatrivo-black-primary">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-eatrivo-purple/10 flex items-center justify-center text-eatrivo-purple">
                <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              Profil používateľa
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Zobrazenie detailných informácií o používateľovi
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-6">
              {/* User Selection */}
              <div className="space-y-2">
                <Label
                  htmlFor="profileUser"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Vybrať používateľa
                </Label>
                <Select
                  value={selectedUserForProfile}
                  onValueChange={onUserChange}
                >
                  <SelectTrigger className="h-11 border-gray-200 focus:ring-eatrivo-purple focus:border-eatrivo-purple">
                    <SelectValue placeholder="Vyberte používateľa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">-- Vyberte používateľa --</SelectItem>
                    {users
                      .filter((user) => user.profileId)
                      .sort((a, b) =>
                        (a.fullName || a.name || "").localeCompare(
                          b.fullName || b.name || "",
                        ),
                      )
                      .map((user) => (
                        <SelectItem
                          key={user.id}
                          value={user.profileId || user.id}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {user.fullName || user.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {user.email}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium">
                              {user.membership || "basic"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loading State */}
              {isLoadingUserInfo && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-eatrivo-purple/30 border-t-eatrivo-purple rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Načítavam údaje...</p>
                  </div>
                </div>
              )}

              {/* No User Selected */}
              {!selectedUserForProfile && !isLoadingUserInfo && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <UserCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Žiadny používateľ nevybratý
                  </h3>
                  <p className="text-sm text-gray-500">
                    Vyberte používateľa pre zobrazenie jeho profilu
                  </p>
                </div>
              )}

              {/* User Info Display */}
              {selectedUserForProfile && !isLoadingUserInfo && userInfo && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-eatrivo-purple" />
                      Základné údaje
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            Pohlavie
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.sex === "man"
                            ? "Muž"
                            : userInfo.sex === "woman"
                              ? "Žena"
                              : "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            Vek
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.dateOfBirth
                            ? `${(() => {
                                const birthDate = new Date(
                                  userInfo.dateOfBirth!,
                                );
                                const today = new Date();
                                let age =
                                  today.getFullYear() - birthDate.getFullYear();
                                const m =
                                  today.getMonth() - birthDate.getMonth();
                                if (
                                  m < 0 ||
                                  (m === 0 &&
                                    today.getDate() < birthDate.getDate())
                                ) {
                                  age--;
                                }
                                return age;
                              })()} rokov`
                            : "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            Výška
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.height
                            ? `${userInfo.height} cm`
                            : "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="w-4 h-4 text-gray-500" />
                          <p className="text-xs font-medium text-gray-500">
                            Váha
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.weight
                            ? `${userInfo.weight} kg`
                            : "Neuvedené"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fitness Goals */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-eatrivo-purple" />
                      Ciele a aktivita
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-blue-500" />
                          <p className="text-xs font-medium text-blue-700">
                            Cieľ
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.goal || "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-4 h-4 text-green-500" />
                          <p className="text-xs font-medium text-green-700">
                            Úroveň aktivity
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.activity_level?.replace(/_/g, " ") ||
                            "Neuvedené"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Diet Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-eatrivo-purple" />
                      Stravovacie preferencie
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="w-4 h-4 text-purple-500" />
                          <p className="text-xs font-medium text-purple-700">
                            Diéta
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.diet_preferences || "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <p className="text-xs font-medium text-orange-700">
                            Čas na varenie
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.cooking_time_pref || "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-pink-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-pink-500" />
                          <p className="text-xs font-medium text-pink-700">
                            Rozpočet
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900 capitalize">
                          {userInfo.budget_preference || "Neuvedené"}
                        </p>
                      </div>
                      <div className="p-4 bg-cyan-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-cyan-500" />
                          <p className="text-xs font-medium text-cyan-700">
                            Jedál denne
                          </p>
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {userInfo.meal_per_day || "Neuvedené"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Preferences Details */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <ThumbsUp className="w-5 h-5 text-eatrivo-purple" />
                      Preferencie jedál
                    </h3>
                    <div className="space-y-3">
                      {userInfo.likes && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                            <p className="text-sm font-semibold text-green-900">
                              Obľúbené jedlá
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {userInfo.likes}
                          </p>
                        </div>
                      )}
                      {userInfo.dislikes && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2 mb-2">
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                            <p className="text-sm font-semibold text-red-900">
                              Neobľúbené jedlá
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {userInfo.dislikes}
                          </p>
                        </div>
                      )}
                      {userInfo.allergies && (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <p className="text-sm font-semibold text-yellow-900">
                              Alergie
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {userInfo.allergies}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* No User Info Available */}
              {selectedUserForProfile && !isLoadingUserInfo && !userInfo && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Žiadne údaje
                  </h3>
                  <p className="text-sm text-gray-500">
                    Tento používateľ nemá vyplnené nutričné informácie
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Stats */}
      <div className="space-y-4 sm:space-y-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl" />
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <UserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              Štatistiky profilov
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2">
            <div className="space-y-3 relative z-10">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">
                    {users.filter((u) => u.isProfileComplete).length}
                  </p>
                  <p className="text-xs text-white/80">Kompletných profilov</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">
                    {users.length > 0
                      ? Math.round(
                          (users.filter((u) => u.isProfileComplete).length /
                            users.length) *
                            100,
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-white/80">Úspešnosť</p>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{
                    width: `${users.length > 0 ? Math.round((users.filter((u) => u.isProfileComplete).length / users.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

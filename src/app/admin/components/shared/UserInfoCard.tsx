import { 
  User, 
  UserCircle, 
  Calendar, 
  Scale, 
  Activity, 
  Target, 
  Heart, 
  AlertTriangle, 
  ThumbsDown,
  AlertCircle 
} from "lucide-react";
import type { UserInfo } from "../types";

interface UserInfoCardProps {
  userInfo: UserInfo | null;
  isLoading: boolean;
}

export default function UserInfoCard({ userInfo, isLoading }: UserInfoCardProps) {
  if (isLoading) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-eatrivo-purple rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Načítavam údaje používateľa...</span>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <AlertCircle className="w-4 h-4 text-orange-500" />
          <span className="text-xs text-orange-700">Používateľ nemá vyplnené nutričné údaje</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle className="w-4 h-4 text-eatrivo-purple" />
          <h4 className="text-xs font-semibold text-gray-900">Info o používateľovi</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {userInfo.sex && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">
                {userInfo.sex === "man" ? "Muž" : "Žena"}
              </span>
            </div>
          )}
          {userInfo.dateOfBirth && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">
                {Math.floor((new Date().getTime() - new Date(userInfo.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} r.
              </span>
            </div>
          )}
          {userInfo.weight && (
            <div className="flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{userInfo.weight} kg</span>
            </div>
          )}
          {userInfo.height && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600">{userInfo.height} cm</span>
            </div>
          )}
          {userInfo.goal && (
            <div className="flex items-center gap-1.5">
              <Target className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 capitalize">{userInfo.goal}</span>
            </div>
          )}
          {userInfo.diet_preferences && (
            <div className="flex items-center gap-1.5">
              <Heart className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-600 capitalize">{userInfo.diet_preferences}</span>
            </div>
          )}
        </div>
        {(userInfo.allergies || userInfo.dislikes) && (
          <div className="mt-2 pt-2 border-t border-purple-200">
            {userInfo.allergies && (
              <div className="flex items-start gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-orange-700 uppercase">Alergie:</span>
                  <p className="text-xs text-gray-700 line-clamp-1">{userInfo.allergies}</p>
                </div>
              </div>
            )}
            {userInfo.dislikes && (
              <div className="flex items-start gap-1.5">
                <ThumbsDown className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-red-700 uppercase">Neobľúbené:</span>
                  <p className="text-xs text-gray-700 line-clamp-1">{userInfo.dislikes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

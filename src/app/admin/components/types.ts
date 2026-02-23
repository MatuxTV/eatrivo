export interface User {
  id: string;
  name: string | null;
  email: string;
  membership: string;
  profileId: string | null;
  fullName: string | null;
  username: string | null;
  isProfileComplete: boolean | null;
}

export interface UserInfo {
  sex: string | null;
  dateOfBirth: string | null;
  height: number | null;
  weight: number | null;
  activity_level: string | null;
  goal: string | null;
  meal_per_day: number | null;
  cooking_time_pref: string | null;
  diet_preferences: string | null;
  budget_preference: string | null;
  likes: string | null;
  dislikes: string | null;
  allergies: string | null;
  language: string | null;
}

export interface UserShoppingList {
  id: string;
  userProfileId: string;
  title: string;
  description: string | null;
  markdownContent: string;
  weekStartDate: string;
  weekEndDate: string;
  status: string;
  created_at: string;
}

export interface UserMealPlan {
  id: string;
  userProfileId: string;
  shoppingListId: string;
  weekStartDate: string;
  weekEndDate: string;
  meals: Record<string, unknown>;
  created_at: string;
}

export interface ShoppingListFormData {
  title: string;
  description: string;
  weekStartDate: string;
  weekEndDate: string;
  status: "active" | "completed" | "cancelled";
  userId?: string;
  markdownContent: string;
}

export interface UpdateItem {
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix";
}

export interface UpdateEmailFormData {
  version: string;
  updateTitle: string;
  updateDescription: string;
  updates: UpdateItem[];
  testEmail: string;
}

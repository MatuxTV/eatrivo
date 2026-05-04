import type {
  PantryDraftItem,
  PantryItem,
  PantryRestockItem,
} from "@/hooks/usePantry";

export interface UserProfileSnapshot {
  fullName: string;
  email: string;
  dateOfBirth: string;
  membership: string;
  badges?: string[];
  isEmailSubscriptionActive: boolean;
}

export interface UserNutritionSnapshot {
  sex: "man" | "woman";
  height: number;
  weight: string | number;
  activity_level: string | null;
  goal: string | null;
  diet_preferences: string | null;
  likes: string | null;
  dislikes: string | null;
  allergies: string | null;
}

export interface InitialProfileSectionData {
  profile: UserProfileSnapshot | null;
  nutrition: UserNutritionSnapshot | null;
}

export interface InitialPantrySectionData {
  items: PantryItem[];
  restockItems: PantryRestockItem[];
  pendingDrafts: PantryDraftItem[];
}
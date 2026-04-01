export type HomeSection = "home" | "home.recipes" | "home.shoppingList";

export type AppHomeSection =
  | HomeSection
  | "pantry"
  | "chatWithRivo"
  | "profile"
  | "kitchenCounter"
  | "mealGallery";

export type PrimaryAppHomeSection = Exclude<AppHomeSection, HomeSection> | "home";

export function getPrimaryAppHomeSection(
  section: AppHomeSection,
): PrimaryAppHomeSection {
  if (section === "home" || section.startsWith("home.")) {
    return "home";
  }

  return section as Exclude<AppHomeSection, HomeSection>;
}

export function isHomeSection(section: AppHomeSection): section is HomeSection {
  return getPrimaryAppHomeSection(section) === "home";
}

export function isProfileSection(section: AppHomeSection): boolean {
  return section === "profile";
}
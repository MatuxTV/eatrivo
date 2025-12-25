export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "0.5.2",
  
  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "0.5.2": {
      title: "Vitajte v Eatrivo! V tejto verzii:",
      features: [
        "Optimalizácia výkonu a rýchlosti aplikácie",
        "Pridanie anglickeho jazyka",
      ],
      releaseDate: "2025-12-25",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion = keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;
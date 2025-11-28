export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "0.3.1",
  
  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "0.3.1": {
      title: "Vitajte v Eatrivo! V tejto verzii:",
      features: [
        "Optimalizácia výkonu a rýchlosti aplikácie",
        "Pridanie interaktívneho feedbackového formulára pre používateľov",
        "Optimalizácia postupu tvorby nákupného zoznamu a jedálneho plánu, vrátane zlepšenej logiky generovania",
      ],
      releaseDate: "2025-11-28",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion = keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;
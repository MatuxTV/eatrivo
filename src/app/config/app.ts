export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "0.4.0",
  
  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "0.4.0": {
      title: "Vitajte v Eatrivo! V tejto verzii:",
      features: [
        "Optimalizácia výkonu a rýchlosti aplikácie",
        "NOVÁ FUNKCIA - Body health circle teraz zohľadňuje úroveň aktivity používateľa pre presnejšie hodnotenie zdravia",
        "NOVÁ FUNKCIA - Vylepšený Weight Tracker s možnosťou pridávať poznámky k jednotlivým záznamom váhy",
      ],
      releaseDate: "2025-12-9",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion = keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;
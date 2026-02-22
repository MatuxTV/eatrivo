export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "1.0.1",

  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "1.0.1": {
      title: "Vitajte v prvej plnej verzii Eatriva! V tejto verzii:",
      features: [
        "EATRIVO je teraz optimalizované pre mobilné zariadenia. Stlačte tlačidlo zdieľania v prehliadači a pridajte Eatrivo na domovskú obrazovku pre rýchly prístup k vášmu plánovaču jedál.",
        "Šablóny pre FREE používateľov",
        "Vylepšenie zážitku z používania aplikácie vďaka nášmu Rivo-vi",
      ],
      releaseDate: "2026-02-22",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion =
  keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;

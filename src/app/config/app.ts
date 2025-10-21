export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "0.0.1",
  
  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "0.0.1": {
      title: "Vitajte v Eatrivo!",
      features: [
        "Personalizované jedálne plány",
        "AI-generované recepty",
      ],
      releaseDate: "2025-01-15",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion = keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;
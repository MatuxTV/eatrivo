export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "0.1.2",
  
  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "0.1.2": {
      title: "Vitajte v Eatrivo!",
      features: [
        "Zobrazenie nutričných hodnôt jedál a použitých surovín",
        "Redizajn používateľského rozhrania pre lepšiu použiteľnosť",
      ],
      releaseDate: "2025-11-19",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion = keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;
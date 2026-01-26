export const APP_CONFIG = {
  // Current welcome dialog version
  WELCOME_DIALOG_VERSION: "0.6.6",
  
  // Changelog for each version
  WELCOME_DIALOG_CHANGELOG: {
    "0.6.6": {
      title: "Vitajte v Eatrivo! V tejto verzii:",
      features: [
        "EATRIVO je teraz optimalizované pre mobilné zariadenia. Stlačte tlačidlo zdieľania v prehliadači a pridajte Eatrivo na domovskú obrazovku pre rýchly prístup k vášmu plánovaču jedál.",
        "Offline režim: Prezerajte si váš najnovší nákupný zoznam a uložené dáta aj bez internetového pripojenia.",
        "Push notifikácie: Zostaňte informovaní o nových nákupných zoznamoch a aktualizáciách priamo na vašom zariadení.",
        "Pridanie prepinania medzi dňami v plánovači jedál pre jednoduchšiu navigáciu.",
      ],
      releaseDate: "2026-01-26",
    },
  } as const,
} as const;

// Helper type pre bezpečnosť
export type WelcomeDialogVersion = keyof typeof APP_CONFIG.WELCOME_DIALOG_CHANGELOG;
import type {
  TutorialCoachmarkDefinition,
  TutorialDefinition,
  TutorialModalDefinition,
  TutorialSurfaceKey,
} from "@/lib/tutorials/types";

export const introTutorialDefinition: TutorialModalDefinition = {
  tutorialKey: "app-intro",
  surfaceKey: "global",
  version: "1.0.0",
  mode: "modal",
  autoStart: true,
  steps: [
    {
      id: "welcome",
      kind: "modal-step",
      eyebrowKey: "intro.steps.welcome.eyebrow",
      titleKey: "intro.steps.welcome.title",
      descriptionKey: "intro.steps.welcome.description",
    },
    {
      id: "planning",
      kind: "modal-step",
      eyebrowKey: "intro.steps.planning.eyebrow",
      titleKey: "intro.steps.planning.title",
      descriptionKey: "intro.steps.planning.description",
    },
    {
      id: "guidance",
      kind: "modal-step",
      eyebrowKey: "intro.steps.guidance.eyebrow",
      titleKey: "intro.steps.guidance.title",
      descriptionKey: "intro.steps.guidance.description",
      ctaLabelKey: "common.actions.startTour",
    },
  ],
};

export const homeRecipesTutorialDefinition: TutorialCoachmarkDefinition = {
  tutorialKey: "surface-tour",
  surfaceKey: "home.recipes",
  version: "1.0.0",
  mode: "coachmark",
  autoStart: true,
  steps: [
    {
      id: "home-nav",
      kind: "coachmark-step",
      target: "nav-home",
      placement: "right",
      titleKey: "coachmarks.homeRecipes.steps.homeNav.title",
      descriptionKey: "coachmarks.homeRecipes.steps.homeNav.description",
    },
    {
      id: "section-switcher",
      kind: "coachmark-step",
      target: "home-section-switcher",
      placement: "bottom",
      titleKey: "coachmarks.homeRecipes.steps.switcher.title",
      descriptionKey: "coachmarks.homeRecipes.steps.switcher.description",
    },
    {
      id: "recipes-grid",
      kind: "coachmark-step",
      target: "home-recipes-section",
      placement: "top",
      titleKey: "coachmarks.homeRecipes.steps.recipes.title",
      descriptionKey: "coachmarks.homeRecipes.steps.recipes.description",
    },
  ],
};

export const shoppingTutorialDefinition: TutorialCoachmarkDefinition = {
  tutorialKey: "surface-tour",
  surfaceKey: "home.shoppingList",
  version: "1.0.0",
  mode: "coachmark",
  autoStart: true,
  steps: [
    {
      id: "shopping-tab",
      kind: "coachmark-step",
      target: "home-tab-shopping",
      placement: "bottom",
      titleKey: "coachmarks.shoppingList.steps.tab.title",
      descriptionKey: "coachmarks.shoppingList.steps.tab.description",
    },
    {
      id: "shopping-list",
      kind: "coachmark-step",
      target: "home-shopping-section",
      placement: "top",
      titleKey: "coachmarks.shoppingList.steps.list.title",
      descriptionKey: "coachmarks.shoppingList.steps.list.description",
    },
  ],
};

export const pantryTutorialDefinition: TutorialCoachmarkDefinition = {
  tutorialKey: "surface-tour",
  surfaceKey: "pantry",
  version: "1.0.0",
  mode: "coachmark",
  autoStart: true,
  steps: [
    {
      id: "pantry-nav",
      kind: "coachmark-step",
      target: "nav-pantry",
      placement: "right",
      titleKey: "coachmarks.pantry.steps.nav.title",
      descriptionKey: "coachmarks.pantry.steps.nav.description",
    },
    {
      id: "pantry-root",
      kind: "coachmark-step",
      target: "pantry-root",
      placement: "top",
      titleKey: "coachmarks.pantry.steps.inventory.title",
      descriptionKey: "coachmarks.pantry.steps.inventory.description",
    },
    {
      id: "pantry-add",
      kind: "coachmark-step",
      target: "pantry-add-item",
      placement: "left",
      titleKey: "coachmarks.pantry.steps.add.title",
      descriptionKey: "coachmarks.pantry.steps.add.description",
    },
  ],
};

export const chatTutorialDefinition: TutorialCoachmarkDefinition = {
  tutorialKey: "surface-tour",
  surfaceKey: "chatWithRivo",
  version: "1.0.0",
  mode: "coachmark",
  autoStart: true,
  steps: [
    {
      id: "chat-nav",
      kind: "coachmark-step",
      target: "nav-chat",
      placement: "right",
      titleKey: "coachmarks.chat.steps.nav.title",
      descriptionKey: "coachmarks.chat.steps.nav.description",
    },
    {
      id: "chat-history",
      kind: "coachmark-step",
      target: "chat-history-trigger",
      placement: "bottom",
      titleKey: "coachmarks.chat.steps.history.title",
      descriptionKey: "coachmarks.chat.steps.history.description",
    },
    {
      id: "chat-composer",
      kind: "coachmark-step",
      target: "chat-composer",
      placement: "top",
      titleKey: "coachmarks.chat.steps.composer.title",
      descriptionKey: "coachmarks.chat.steps.composer.description",
    },
  ],
};

export const tutorialRegistry = {
  intro: introTutorialDefinition,
  homeRecipes: homeRecipesTutorialDefinition,
  shoppingList: shoppingTutorialDefinition,
  pantry: pantryTutorialDefinition,
  chat: chatTutorialDefinition,
} satisfies Record<string, TutorialDefinition>;

export const surfaceTutorialRegistry: Partial<Record<TutorialSurfaceKey, TutorialCoachmarkDefinition>> = {
  "home.recipes": homeRecipesTutorialDefinition,
  "home.shoppingList": shoppingTutorialDefinition,
  pantry: pantryTutorialDefinition,
  chatWithRivo: chatTutorialDefinition,
};
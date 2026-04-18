export const TUTORIAL_SURFACES = [
  "global",
  "home.recipes",
  "home.shoppingList",
  "pantry",
  "chatWithRivo",
] as const;

export const TUTORIAL_STATUSES = [
  "unseen",
  "started",
  "completed",
  "dismissed",
  "skipped",
] as const;

export type TutorialSurfaceKey = (typeof TUTORIAL_SURFACES)[number];
export type TutorialStatus = (typeof TUTORIAL_STATUSES)[number];
export type TutorialMode = "modal" | "coachmark";
export type TutorialPlacement = "top" | "right" | "bottom" | "left";

export interface TutorialBaseStep {
  id: string;
  titleKey?: string;
  title?: string;
  descriptionKey?: string;
  description?: string;
  eyebrowKey?: string;
  eyebrow?: string;
  ctaLabelKey?: string;
  ctaLabel?: string;
  featureList?: string[];
}

export interface TutorialModalStep extends TutorialBaseStep {
  kind: "modal-step";
}

export interface TutorialCoachmarkStep extends TutorialBaseStep {
  kind: "coachmark-step";
  target: string;
  placement?: TutorialPlacement;
}

export interface TutorialDefinitionBase {
  tutorialKey: string;
  surfaceKey: TutorialSurfaceKey;
  version: string;
  autoStart?: boolean;
}

export interface TutorialModalDefinition extends TutorialDefinitionBase {
  mode: "modal";
  steps: TutorialModalStep[];
}

export interface TutorialCoachmarkDefinition extends TutorialDefinitionBase {
  mode: "coachmark";
  steps: TutorialCoachmarkStep[];
}

export type TutorialDefinition =
  | TutorialModalDefinition
  | TutorialCoachmarkDefinition;

export interface TutorialStateRecord {
  tutorialKey: string;
  surfaceKey: TutorialSurfaceKey;
  version: string;
  status: TutorialStatus;
  lastStepIndex: number;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  completedAt?: string | null;
  dismissedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function buildTutorialStateKey(tutorialKey: string, surfaceKey: TutorialSurfaceKey) {
  return `${tutorialKey}:${surfaceKey}`;
}
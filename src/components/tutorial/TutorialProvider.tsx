"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

import { APP_CONFIG } from "@/app/config/app";
import { TutorialCoachmark } from "@/components/tutorial/TutorialCoachmark";
import { TutorialModal } from "@/components/tutorial/TutorialModal";
import { trackClientEvent } from "@/lib/analytics-client";
import {
  introTutorialDefinition,
  surfaceTutorialRegistry,
} from "@/lib/tutorials/registry";
import {
  buildTutorialStateKey,
  type TutorialCoachmarkDefinition,
  type TutorialDefinition,
  type TutorialModalDefinition,
  type TutorialStateRecord,
  type TutorialStatus,
  type TutorialSurfaceKey,
} from "@/lib/tutorials/types";

interface ActiveTutorialRun {
  definition: TutorialDefinition;
  stepIndex: number;
  isAnnouncement?: boolean;
}

interface TutorialContextValue {
  setCurrentSurface: (surface: TutorialSurfaceKey | null) => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

function getAnnouncementDefinition(version: string, features: readonly string[]) {
  const title = features.length > 0 ? "Čo je nové v Eatrive" : "Vitaj späť v Eatrive";
  const description =
    features.length > 0
      ? "Pozri si hlavné zmeny v tejto verzii, potom ťa pustíme späť do aplikácie."
      : "V aplikácii pribudli drobné vylepšenia a stabilnejšie mobile správanie.";

  return {
    tutorialKey: "release-notes",
    surfaceKey: "global",
    version,
    mode: "modal",
    steps: [
      {
        id: "release-notes",
        kind: "modal-step",
        eyebrow: `Version ${version}`,
        title,
        description,
        ctaLabel: "Pokračovať do aplikácie",
        featureList: [...features],
      },
    ],
  } satisfies TutorialModalDefinition;
}

function normalizeStates(states: TutorialStateRecord[]) {
  return states.reduce<Record<string, TutorialStateRecord>>((accumulator, state) => {
    accumulator[buildTutorialStateKey(state.tutorialKey, state.surfaceKey)] = state;
    return accumulator;
  }, {});
}

async function persistTutorialState(payload: {
  tutorialKey: string;
  surfaceKey: TutorialSurfaceKey;
  version: string;
  status: TutorialStatus;
  lastStepIndex: number;
  metadata?: Record<string, unknown> | null;
}) {
  await fetch("/api/user/tutorial-state", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasLoadedStates, setHasLoadedStates] = useState(false);
  const [states, setStates] = useState<Record<string, TutorialStateRecord>>({});
  const [currentSurface, setCurrentSurface] = useState<TutorialSurfaceKey | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<ActiveTutorialRun | null>(null);
  const [acknowledgedWelcomeVersion, setAcknowledgedWelcomeVersion] = useState<string | null>(
    session?.user?.lastSeenWelcomeVersion ?? null,
  );

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setAcknowledgedWelcomeVersion(session?.user?.lastSeenWelcomeVersion ?? null);
  }, [currentUserId, session?.user?.lastSeenWelcomeVersion]);

  const loadStatesFromServer = useCallback(async () => {
    if (!currentUserId) {
      setStates({});
      setHasLoadedStates(false);
      return;
    }

    try {
      const response = await fetch("/api/user/tutorial-state", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { states?: TutorialStateRecord[] };
      setStates(normalizeStates(payload.states ?? []));
      setHasLoadedStates(true);
    } catch {
      // Keep the app usable if tutorial state cannot be loaded.
    }
  }, [currentUserId]);

  useEffect(() => {
    if (status !== "authenticated" || !currentUserId) {
      setStates({});
      setHasLoadedStates(false);
      return;
    }

    setHasLoadedStates(false);
    void loadStatesFromServer();
  }, [currentUserId, loadStatesFromServer, status]);

  useEffect(() => {
    if (!isHydrated || status !== "authenticated" || activeTutorial) {
      return;
    }

    const handleFocus = () => {
      void loadStatesFromServer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadStatesFromServer();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTutorial, isHydrated, loadStatesFromServer, status]);

  const getStateForDefinition = useCallback(
    (definition: TutorialDefinition) =>
      states[buildTutorialStateKey(definition.tutorialKey, definition.surfaceKey)],
    [states],
  );

  const upsertLocalState = useCallback(
    (
      definition: TutorialDefinition,
      nextStatus: TutorialStatus,
      lastStepIndex: number,
      metadata?: Record<string, unknown> | null,
    ) => {
      const key = buildTutorialStateKey(definition.tutorialKey, definition.surfaceKey);
      const now = new Date().toISOString();

      setStates((current) => {
        const previous = current[key];
        const nextState: TutorialStateRecord = {
          tutorialKey: definition.tutorialKey,
          surfaceKey: definition.surfaceKey,
          version: definition.version,
          status: nextStatus,
          lastStepIndex,
          metadata: metadata ?? previous?.metadata ?? null,
          firstSeenAt: previous?.firstSeenAt ?? now,
          lastSeenAt: now,
          completedAt: nextStatus === "completed" ? now : previous?.completedAt ?? null,
          dismissedAt:
            nextStatus === "dismissed" || nextStatus === "skipped"
              ? now
              : previous?.dismissedAt ?? null,
        };

        const nextStates = {
          ...current,
          [key]: nextState,
        };

        return nextStates;
      });

      void persistTutorialState({
        tutorialKey: definition.tutorialKey,
        surfaceKey: definition.surfaceKey,
        version: definition.version,
        status: nextStatus,
        lastStepIndex,
        metadata,
      });
    },
    [],
  );

  const startTutorial = useCallback(
    (definition: TutorialDefinition, isAnnouncement = false) => {
      setActiveTutorial({ definition, stepIndex: 0, isAnnouncement });

      if (!isAnnouncement) {
        upsertLocalState(definition, "started", 0, { trigger: "auto" });
        trackClientEvent({
          eventName: "tutorial_started",
          metadata: {
            tutorialKey: definition.tutorialKey,
            surfaceKey: definition.surfaceKey,
            version: definition.version,
          },
        });
      }
    },
    [upsertLocalState],
  );

  const closeAnnouncement = useCallback(async () => {
    setAcknowledgedWelcomeVersion(APP_CONFIG.WELCOME_DIALOG_VERSION);

    try {
      await fetch("/api/user/update-dialog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version: APP_CONFIG.WELCOME_DIALOG_VERSION }),
      });
    } catch {
      // Announcement acknowledgement should never block the app shell.
    }

    trackClientEvent({
      eventName: "tutorial_announcement_seen",
      metadata: {
        version: APP_CONFIG.WELCOME_DIALOG_VERSION,
      },
    });
    setActiveTutorial(null);
  }, []);

  const finishTutorial = useCallback(
    (definition: TutorialDefinition, nextStatus: TutorialStatus) => {
      upsertLocalState(definition, nextStatus, activeTutorial?.stepIndex ?? 0, {
        trigger: "auto",
      });

      if (nextStatus === "completed") {
        trackClientEvent({
          eventName: "tutorial_completed",
          metadata: {
            tutorialKey: definition.tutorialKey,
            surfaceKey: definition.surfaceKey,
            version: definition.version,
          },
        });
      }

      if (nextStatus === "skipped" || nextStatus === "dismissed") {
        trackClientEvent({
          eventName: nextStatus === "skipped" ? "tutorial_skipped" : "tutorial_dismissed",
          metadata: {
            tutorialKey: definition.tutorialKey,
            surfaceKey: definition.surfaceKey,
            version: definition.version,
          },
        });
      }

      setActiveTutorial(null);
    },
    [activeTutorial?.stepIndex, upsertLocalState],
  );

  useEffect(() => {
    if (!activeTutorial || activeTutorial.isAnnouncement) {
      return;
    }

    trackClientEvent({
      eventName: "tutorial_step_viewed",
      metadata: {
        tutorialKey: activeTutorial.definition.tutorialKey,
        surfaceKey: activeTutorial.definition.surfaceKey,
        version: activeTutorial.definition.version,
        stepIndex: activeTutorial.stepIndex,
        stepId: activeTutorial.definition.steps[activeTutorial.stepIndex]?.id,
      },
    });
  }, [activeTutorial]);

  useEffect(() => {
    if (
      !isHydrated ||
      status !== "authenticated" ||
      !hasLoadedStates ||
      activeTutorial ||
      !currentSurface
    ) {
      return;
    }

    const lastSeenWelcomeVersion = session?.user?.lastSeenWelcomeVersion;
    const needsAnnouncement =
      Boolean(acknowledgedWelcomeVersion ?? lastSeenWelcomeVersion) &&
      (acknowledgedWelcomeVersion ?? lastSeenWelcomeVersion) !== APP_CONFIG.WELCOME_DIALOG_VERSION;

    if (needsAnnouncement) {
      const announcement = getAnnouncementDefinition(
        APP_CONFIG.WELCOME_DIALOG_VERSION,
        APP_CONFIG.WELCOME_DIALOG_CHANGELOG[APP_CONFIG.WELCOME_DIALOG_VERSION]?.features ?? [],
      );
      startTutorial(announcement, true);
      return;
    }

    const introState = getStateForDefinition(introTutorialDefinition);

    if (!introState) {
      startTutorial(introTutorialDefinition);
      return;
    }

    if (introState?.status !== "completed") {
      return;
    }

    const surfaceDefinition = surfaceTutorialRegistry[currentSurface];
    if (!surfaceDefinition) {
      return;
    }

    const surfaceState = getStateForDefinition(surfaceDefinition);
    if (!surfaceState) {
      startTutorial(surfaceDefinition);
    }
  }, [
    activeTutorial,
    currentSurface,
    getStateForDefinition,
    hasLoadedStates,
    isHydrated,
    acknowledgedWelcomeVersion,
    session?.user?.lastSeenWelcomeVersion,
    startTutorial,
    status,
  ]);

  const contextValue = useMemo<TutorialContextValue>(
    () => ({
      setCurrentSurface,
    }),
    [],
  );

  const handleNext = useCallback(() => {
    if (!activeTutorial) {
      return;
    }

    const total = activeTutorial.definition.steps.length;
    const nextStepIndex = activeTutorial.stepIndex + 1;

    if (nextStepIndex >= total) {
      if (activeTutorial.isAnnouncement) {
        void closeAnnouncement();
        return;
      }

      finishTutorial(activeTutorial.definition, "completed");
      return;
    }

    if (!activeTutorial.isAnnouncement) {
      upsertLocalState(activeTutorial.definition, "started", nextStepIndex, {
        trigger: "auto",
      });
    }

    setActiveTutorial((current) =>
      current
        ? {
            ...current,
            stepIndex: nextStepIndex,
          }
        : current,
    );
  }, [activeTutorial, closeAnnouncement, finishTutorial, upsertLocalState]);

  const handleBack = useCallback(() => {
    setActiveTutorial((current) =>
      current
        ? {
            ...current,
            stepIndex: Math.max(0, current.stepIndex - 1),
          }
        : current,
    );
  }, []);

  const handleSkip = useCallback(() => {
    if (!activeTutorial) {
      return;
    }

    if (activeTutorial.isAnnouncement) {
      void closeAnnouncement();
      return;
    }

    finishTutorial(activeTutorial.definition, "skipped");
  }, [activeTutorial, closeAnnouncement, finishTutorial]);

  const handleClose = useCallback(() => {
    if (!activeTutorial) {
      return;
    }

    if (activeTutorial.isAnnouncement) {
      void closeAnnouncement();
      return;
    }

    finishTutorial(activeTutorial.definition, "dismissed");
  }, [activeTutorial, closeAnnouncement, finishTutorial]);

  const handleMissingTarget = useCallback(() => {
    if (!activeTutorial) {
      return;
    }

    const isLastStep = activeTutorial.stepIndex >= activeTutorial.definition.steps.length - 1;
    if (isLastStep) {
      finishTutorial(activeTutorial.definition, "completed");
      return;
    }

    setActiveTutorial((current) =>
      current
        ? {
            ...current,
            stepIndex: current.stepIndex + 1,
          }
        : current,
    );
  }, [activeTutorial, finishTutorial]);

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      {activeTutorial?.definition.mode === "modal" ? (
        <TutorialModal
          open
          definition={activeTutorial.definition as TutorialModalDefinition}
          stepIndex={activeTutorial.stepIndex}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={handleSkip}
          onClose={handleClose}
        />
      ) : null}
      {activeTutorial?.definition.mode === "coachmark" ? (
        <TutorialCoachmark
          step={
            (activeTutorial.definition as TutorialCoachmarkDefinition).steps[
              activeTutorial.stepIndex
            ]
          }
          stepIndex={activeTutorial.stepIndex}
          totalSteps={activeTutorial.definition.steps.length}
          onBack={handleBack}
          onNext={handleNext}
          onSkip={handleSkip}
          onClose={handleClose}
          onTargetMissing={handleMissingTarget}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}

export function useTutorialSurface(surface: TutorialSurfaceKey | null) {
  const context = useContext(TutorialContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setCurrentSurface(surface);

    return () => {
      context.setCurrentSurface(null);
    };
  }, [context, surface]);
}
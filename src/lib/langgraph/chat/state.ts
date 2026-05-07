import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";
import { messagesStateReducer } from "@langchain/langgraph";
import type {
  Intent,
  ChatUserProfile,
  ChatUserInfo,
  MacroTargets,
  MealPlanData,
  PantryItem,
} from "./types";
import type { ChatAssistantMessageMetadata } from "@/lib/chat/message-metadata";

export const ChatState = Annotation.Root({
  // Konverzačná história — append reducer
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Identity
  userProfileId: Annotation<string>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  sessionId: Annotation<string>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => "",
  }),
  userProfile: Annotation<ChatUserProfile | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  userInfo: Annotation<ChatUserInfo | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Intent
  intent: Annotation<Intent | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Lazy-loaded kontext (plní sa len ak potrebný intent)
  todaysPlan: Annotation<MealPlanData | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  macroTargets: Annotation<MacroTargets | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  pantryItems: Annotation<PantryItem[] | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Error handling
  error: Annotation<string | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  assistantMessageMetadata: Annotation<ChatAssistantMessageMetadata | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),

  // Generated System Prompt
  systemPrompt: Annotation<string | null>({
    value: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
});

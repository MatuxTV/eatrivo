/**
 * Landing Page Type Definitions
 *
 * Strict TypeScript interfaces following Anders Hejlsberg's design principles.
 * Using discriminated unions and proper generic constraints.
 */

import type { LucideIcon } from "lucide-react";

// Section Props Interface - Base for all sections
export interface SectionProps {
  id?: string;
  className?: string;
  "aria-labelledby"?: string;
}

// Feature Card Types
export interface FeatureItem {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly color: FeatureColor;
}

export type FeatureColor =
  | "purple"
  | "pink"
  | "blue"
  | "green"
  | "orange"
  | "red";

// How It Works Step Types
export interface HowItWorksStep {
  readonly number: 1 | 2 | 3;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
}

// Pain/Solution Types
export interface PainSolutionItem {
  readonly problem: string;
  readonly solution: string;
}

// FAQ Types
export interface FAQItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

// Pricing Tier Types
export interface PricingTier {
  readonly id: "free" | "premium";
  readonly name: string;
  readonly price: string;
  readonly period?: string;
  readonly description: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly highlighted?: boolean;
}

// Hero Floating Card Types
export interface FloatingCard {
  readonly type: "meal" | "shopping" | "stats";
  readonly position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

// Social Proof Stat Types
export interface SocialProofStat {
  readonly id: string;
  readonly icon?: LucideIcon;
}

// Goal Card Types
export interface GoalItem {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly color: FeatureColor;
}

// App Showcase Feature Types
export interface AppShowcaseFeature {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly color: FeatureColor;
}

// Testimonial Types
export interface TestimonialItem {
  readonly id: string;
  readonly initials: string;
  readonly color: FeatureColor;
  readonly rating: number;
}

// Color mapping utility type
export const colorClassMap: Record<FeatureColor, { bg: string; text: string }> =
  {
    purple: { bg: "bg-eatrivo-purple/10", text: "text-eatrivo-purple" },
    pink: { bg: "bg-eatrivo-pink/10", text: "text-eatrivo-pink" },
    blue: { bg: "bg-eatrivo-blue/10", text: "text-eatrivo-blue" },
    green: { bg: "bg-eatrivo-green/10", text: "text-eatrivo-green" },
    orange: { bg: "bg-eatrivo-orange/10", text: "text-eatrivo-orange" },
    red: { bg: "bg-eatrivo-red/10", text: "text-eatrivo-red" },
  } as const;

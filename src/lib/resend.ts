import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error(
    "RESEND_API_KEY is not defined in environment variables. Please add it to your .env file."
  );
}

// Create Resend client instance
export const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email - can be overridden per email
export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Acme <onboarding@resend.dev>";

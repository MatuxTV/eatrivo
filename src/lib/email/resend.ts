import { Resend } from "resend";

const isProduction = process.env.NODE_ENV === "production";
const resendApiKey = process.env.RESEND_API_KEY?.trim();
const resendFromEmail = process.env.RESEND_FROM_EMAIL?.trim();

if (!resendApiKey) {
  throw new Error(
    "RESEND_API_KEY is not defined in environment variables. Please add it to your .env file."
  );
}

if (isProduction && !resendFromEmail) {
  throw new Error(
    "RESEND_FROM_EMAIL is not defined in environment variables. Production email sends must use a configured sender address."
  );
}

// Create Resend client instance
export const resend = new Resend(resendApiKey);

// Default sender email - can be overridden per email
export const DEFAULT_FROM_EMAIL =
  resendFromEmail || "Acme <onboarding@resend.dev>";

import { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Generic error messages for production
 * Don't expose internal details to users
 */
const GENERIC_ERRORS: Record<number, string> = {
  400: "Invalid request",
  401: "Authentication required",
  403: "Access denied",
  404: "Resource not found",
  409: "Conflict - resource already exists",
  429: "Too many requests",
  500: "Something went wrong",
};

export interface SafeErrorOptions {
  /** HTTP status code */
  status?: number;
  /** Error code for client-side handling */
  code?: string;
  /** Additional context (only shown in development) */
  details?: unknown;
}

/**
 * Create a safe error response that hides internal details in production
 */
export function safeErrorResponse(
  message: string,
  options: SafeErrorOptions = {},
): NextResponse {
  const { status = 500, code, details } = options;

  const responseBody: Record<string, unknown> = {
    error: isProduction
      ? GENERIC_ERRORS[status] || GENERIC_ERRORS[500]
      : message,
    success: false,
  };

  if (code) {
    responseBody.code = code;
  }

  // Only include details in development
  if (!isProduction && details) {
    responseBody.details =
      details instanceof Error
        ? { message: details.message, stack: details.stack }
        : details;
  }

  return NextResponse.json(responseBody, { status });
}

/**
 * Log error and return safe response
 */
export function handleApiError(
  error: unknown,
  context: string,
  options: Omit<SafeErrorOptions, "details"> = {},
): NextResponse {
  // Always log full error server-side
  console.error(`[${context}] Error:`, error);

  const message = error instanceof Error ? error.message : "Unknown error";

  return safeErrorResponse(message, {
    ...options,
    status: options.status || 500,
    details: error,
  });
}

/**
 * Validation error response helper
 */
export function validationError(message: string, field?: string): NextResponse {
  return safeErrorResponse(message, {
    status: 400,
    code: "VALIDATION_ERROR",
    details: field ? { field } : undefined,
  });
}

/**
 * Not found error response helper
 */
export function notFoundError(resource: string = "Resource"): NextResponse {
  return safeErrorResponse(`${resource} not found`, {
    status: 404,
    code: "NOT_FOUND",
  });
}

/**
 * Unauthorized error response helper
 */
export function unauthorizedError(
  message: string = "Authentication required",
): NextResponse {
  return safeErrorResponse(message, {
    status: 401,
    code: "UNAUTHORIZED",
  });
}

/**
 * Forbidden error response helper
 */
export function forbiddenError(
  message: string = "Access denied",
): NextResponse {
  return safeErrorResponse(message, {
    status: 403,
    code: "FORBIDDEN",
  });
}

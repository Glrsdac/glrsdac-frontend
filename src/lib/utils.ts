import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/**
 * Sanitize error messages to prevent exposing database structure
 * Returns a user-friendly error message and logs the full error for debugging
 */
export function getSafeErrorMessage(error: any, defaultMessage: string = "An error occurred"): string {
  if (!error) return defaultMessage;

  const message = error?.message || String(error);
  
  // Check for database-specific error patterns
  const isDatabaseError = message.includes("relation") || 
                         message.includes("column") ||
                         message.includes("syntax") ||
                         message.includes("does not exist") ||
                         message.includes("unique constraint");

  if (isDatabaseError) {
    // Log full error for debugging but don't expose to user
    console.error("Database error (hidden from user):", message);
    return defaultMessage;
  }

  // For safe error messages, pass them through
  return message || defaultMessage;
}
/**
 * Legal document versions — update these whenever a legal document is modified.
 * These versions are stored in consent_logs for audit trail compliance (GDPR Art. 7).
 *
 * Format: "v{major}.{minor}" — bump major for substantive changes, minor for corrections.
 */
export const LEGAL_DOCUMENT_VERSIONS = {
  terms_and_privacy: "v1.1", // Updated 2026-02-24: placeholders filled, law 108/2024, DIČ added
  medical_disclaimer: "v1.1", // Updated 2026-02-24: date placeholder filled
  health_data_processing: "v1.1", // Updated 2026-02-24: aligned with Privacy Policy v1.1
} as const;

export type ConsentType = keyof typeof LEGAL_DOCUMENT_VERSIONS;

/**
 * Get the current document version for a given consent type.
 */
export function getDocumentVersion(type: ConsentType): string {
  return LEGAL_DOCUMENT_VERSIONS[type];
}

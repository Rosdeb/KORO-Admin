/**
 * Types mirror the schemas in the live OpenAPI spec at /v3/api-docs — not guessed
 * from the prose doc. See doc/API_MAPPING.md for the endpoint → type map.
 */

export type Role = "ROLE_USER" | "ROLE_LANGUAGE_REVIEWER" | "ROLE_ADMIN" | "ROLE_MODERATOR";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  nativeLanguage: string | null;
  preferredLanguage: string | null;
  roles: Role[];
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface Language {
  id: string;
  name: string;
  nativeName: string;
  code: string;
  region: string | null;
  active: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Concept {
  id: string;
  name: string;
  description: string | null;
  category: Category | null;
  referenceImage: string | null;
}

export interface TranslationResponse {
  id: string;
  conceptId: string;
  conceptName: string;
  categoryName: string;
  languageId: string;
  languageName: string;
  text: string;
  pronunciation: string | null;
  verified: boolean;
  notes: string | null;
}

/**
 * A submission is a full dictionary entry — a word in its source language, plus the
 * two translations that are always required (Bangla, English) — not a suggestion
 * against a pre-existing Concept. On approval the backend finds-or-creates a Concept
 * by `englishTranslation` and upserts Translation rows for the source language (and
 * Bangla/English, unless the source language already is one of those); no separate
 * dictionary-read endpoint exists, the word simply becomes visible through the
 * existing `/api/v1/translations` family. See docs/API_MAPPING.md.
 */
export interface TranslationSubmission {
  id: string;
  category: Category;
  sourceLanguage: Language;
  sourceWord: string;
  banglaTranslation: string;
  englishTranslation: string;
  pronunciation: string | null;
  exampleSentence: string | null;
  notes: string | null;
  submittedBy: UserResponse;
  status: SubmissionStatus | string;
  reviewerNote: string | null;
  rejectionReason: string | null;
  reviewedBy: UserResponse | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export interface ActivityLog {
  id: string;
  user: UserResponse;
  activityType: string;
  description: string | null;
  referenceId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  device: string | null;
  createdAt: string;
}

export interface Collection {
  id: string;
  user: UserResponse;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PdfExport {
  id: string;
  user: UserResponse;
  collection: Collection;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export interface ImageRecognitionResponse {
  id: string;
  imageUrl: string;
  detectedLabel: string;
  confidence: number;
  conceptId: string | null;
  conceptName: string | null;
  categoryName: string | null;
  translations: TranslationResponse[];
  createdAt: string;
}

// ---- Request payloads ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: { access_token: string; refresh_token: string };
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

/**
 * The admin create/update endpoints for Language, Category and Concept take the
 * entity schema itself as the request body (confirmed via /v3/api-docs — there is
 * no separate *Request DTO for these three, unlike Translation/Submission). `id`,
 * `createdAt` and `updatedAt` are ignored by the backend on write.
 */
export type LanguagePayload = Omit<Language, "id" | "createdAt" | "updatedAt">;

export type CategoryPayload = Omit<Category, "id">;

/** Concept's nested `category` only needs its `id` populated for JPA to resolve the reference. */
export interface ConceptPayload {
  name: string;
  description?: string | null;
  category: { id: string } | null;
  referenceImage?: string | null;
}

export interface TranslationRequest {
  conceptId: string;
  languageId: string;
  text: string;
  pronunciation?: string | null;
  notes?: string | null;
}

export interface SubmissionReviewRequest {
  reviewerNote?: string;
  /** Required by the backend (400 if missing/blank) when calling the reject endpoint. */
  rejectionReason?: string;
}

/**
 * Body for `POST /api/v1/submissions` (end-user "submit a word" flow — see
 * "Endpoints intentionally not surfaced" in docs/API_MAPPING.md; kept here for type
 * parity with the live schema even though the admin panel doesn't create submissions).
 */
export interface SubmissionRequest {
  categoryId: string;
  sourceLanguageId: string;
  sourceWord: string;
  banglaTranslation: string;
  englishTranslation: string;
  pronunciation?: string;
  exampleSentence?: string;
  note?: string;
}

/** Generic error envelope returned by the backend's default exception handler. */
export interface ApiErrorBody {
  path?: string;
  error?: string;
  message?: string;
  status?: number;
  timestamp?: string;
}

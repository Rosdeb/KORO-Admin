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

export interface TranslationSubmission {
  id: string;
  concept: Concept;
  language: Language;
  suggestedTranslation: string;
  pronunciation: string | null;
  notes: string | null;
  submittedBy: UserResponse;
  status: SubmissionStatus | string;
  reviewerNote: string | null;
  reviewedBy: UserResponse | null;
  createdAt: string;
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
}

/** Generic error envelope returned by the backend's default exception handler. */
export interface ApiErrorBody {
  path?: string;
  error?: string;
  message?: string;
  status?: number;
  timestamp?: string;
}

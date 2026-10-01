/**
 * Types mirror the schemas in the live OpenAPI spec at /v3/api-docs — not guessed
 * from the prose doc. See doc/API_MAPPING.md for the endpoint → type map.
 */

export type Role = "ROLE_USER" | "ROLE_LANGUAGE_REVIEWER" | "ROLE_ADMIN" | "ROLE_MODERATOR";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ContactMessageStatus = "PENDING" | "READ" | "REPLIED" | "ARCHIVED";

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

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
  category?: Category | null;
  categoryId?: string | null;
  categoryName?: string | null;
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
  exampleSentence?: string | null;
}

/**
 * Body for `POST /api/v1/translations/search` (authenticated, any role — see api_doc §4).
 * The backend Unicode-normalizes `query` (NFC, zero-width joiners stripped) and matches it
 * case-insensitively, as a substring, against the translation `text`, its `pronunciation`
 * and the parent concept's `name`/`description`, then de-duplicates by id. The response is
 * the same `TranslationResponse[]` shape the list endpoint returns — no fields are dropped.
 *
 * | sourceLanguageId | targetLanguageId | behaviour |
 * |---|---|---|
 * | set | set | match in the source language, return the concepts' entries in the target language |
 * | —   | set | search inside the target language only |
 * | —   | —   | global search across every language |
 */
export interface TranslationSearchRequest {
  query: string;
  sourceLanguageId?: string;
  targetLanguageId?: string;
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
  category?: Category;
  sourceLanguage?: Language;
  sourceWord: string;
  banglaTranslation: string;
  englishTranslation: string;
  pronunciation: string | null;
  exampleSentence: string | null;
  notes: string | null;
  submittedBy?: UserResponse;
  status: SubmissionStatus | string;
  reviewerNote: string | null;
  rejectionReason: string | null;
  reviewedBy?: UserResponse | null;
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

/**
 * "My Books" (saved vocabulary collections) and PDF export are **owner-scoped end-user
 * features** — the admin panel has no UI for them and the API gives admins no way to read
 * other users' books (see "Endpoints intentionally not surfaced" in docs/API_MAPPING.md).
 * These types are kept only for schema parity and are transcribed from the backend feature
 * changelog; reconcile against /v3/api-docs before building any consuming UI.
 *
 * Note: `GET/POST/PUT /api/v1/collections` and the export endpoints used to return the raw
 * JPA entities, which embedded the owner `User` (including its bcrypt password hash). They
 * now return the trimmed DTOs below — no `user` field.
 */
export interface CollectionSummaryResponse {
  id: string;
  name: string;
  description: string | null;
  /** Number of saved words in the book. */
  itemCount: number;
  /** Number of distinct chapters. */
  chapterCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Returned by `GET /api/v1/collections/{id}` and by create/update (with `items: []`). */
export interface CollectionResponse {
  id: string;
  name: string;
  description: string | null;
  /** Author-defined chapter order; `null` means "order chapters by name". */
  chapterOrder: string[] | null;
  createdAt: string;
  updatedAt: string;
  items: CollectionItemResponse[];
}

export interface CollectionItemResponse {
  id: string;
  conceptId: string;
  conceptName: string;
  categoryName: string;
  languageId: string;
  languageName: string;
  /** The saved translation's text (named `translationText`, not `text`, in this DTO). */
  translationText: string;
  pronunciation: string | null;
  exampleSentence: string | null;
  notes: string | null;
  /** Chapter this word sits in; defaults to `"General"`. */
  chapter: string;
  /** Position within the chapter (single-add now defaults to end-of-chapter, not 0). */
  displayOrder: number;
  createdAt: string;
}

/** Returned by `POST /api/v1/collections/{id}/items/bulk` — always `200`. */
export interface CollectionItemsBulkResponse {
  added: CollectionItemResponse[];
  skipped: { conceptId: string; reason: string }[];
}

/** Returned by `GET /api/v1/export/history` (list), `GET /api/v1/export/{id}` and `POST /api/v1/export/pdf`. */
export interface PdfExportResponse {
  id: string;
  collectionId: string;
  collectionName: string;
  fileName: string;
  /** e.g. `/api/v1/export/files/<uuid>.pdf` — public (unguessable UUID), shareable link. */
  fileUrl: string;
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

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  userId?: string | null;
  replySubject?: string | null;
  replyMessage?: string | null;
  repliedBy?: string | null;
  repliedByUserId?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessageStatistics {
  total: number;
  pending: number;
  read: number;
  replied: number;
  archived: number;
}

export interface ContactMessageReplyRequest {
  subject: string;
  message: string;
}

export interface ContactMessageReplyResponse {
  message: string;
  contactMessage: ContactMessage;
}

export interface ContactMessageStatusUpdateRequest {
  status: ContactMessageStatus;
}

export interface ContactMessageStatusUpdateResponse {
  id: string;
  status: ContactMessageStatus;
  name: string;
  email: string;
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
 * Response envelope from `POST /api/v1/admin/submissions/{id}/approve`.
 * The approve endpoint no longer returns the bare submission — it wraps the reviewed
 * submission alongside the concept it was filed under and a human-readable list of the
 * dictionary rows that were created (source word, Bangla, English). The reject endpoint
 * still returns the bare `TranslationSubmission`.
 */
export interface SubmissionApproveResponse {
  submission: TranslationSubmission;
  conceptId: string;
  /** e.g. `["Chakma: বান", "Bangla: গাছ", "English: Tree"]` — safe to show as a toast. */
  translationsSaved: string[];
}

export interface SubmissionApproveAllResponse {
  approvedCount: number;
  approvedIds: string[];
  message: string;
  failed?: string[];
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

/**
 * "My Books" / PDF export request bodies — parity only, no consuming UI in the admin panel
 * (see the response types above and "Endpoints intentionally not surfaced" in docs/API_MAPPING.md).
 */
export interface CollectionItemBulkRequest {
  languageId: string;
  conceptIds: string[];
  chapter?: string;
  notes?: string;
}

export interface CollectionItemPatchRequest {
  /** `""` resets to `"General"`. */
  chapter?: string;
  displayOrder?: number;
  /** `""` clears the note. */
  notes?: string;
  /** `409` if the book already has this concept in the target language. */
  languageId?: string;
}

/** `to` omitted → keep the name, just take this position. List order becomes the book's chapter order. */
export interface CollectionChaptersRequest {
  chapters: { from: string; to?: string }[];
}

export interface PdfExportRequest {
  collectionId: string;
  /** One printed column per language, in this order. At least one of `languageIds`/`languageId` is required. */
  languageIds?: string[];
  /** Legacy single-language alias, still accepted. */
  languageId?: string;
  /** Language that leads each entry; defaults to the first of `languageIds`. */
  headwordLanguageId?: string;
  /** Default `true`. */
  includeExampleSentences?: boolean;
}

/** Generic error envelope returned by the backend's default exception handler. */
export interface ApiErrorBody {
  path?: string;
  error?: string;
  message?: string;
  status?: number;
  timestamp?: string;
}

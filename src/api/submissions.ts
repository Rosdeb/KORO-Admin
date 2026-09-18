import { httpClient } from "./client";
import type {
  SubmissionApproveAllResponse,
  SubmissionApproveResponse,
  PageResponse,
  SubmissionReviewRequest,
  TranslationSubmission,
} from "@/types/api";

interface SubmissionPageParams {
  page?: number;
  size?: number;
}

export const submissionsApi = {
  /** Only the PENDING queue is exposed to admins/reviewers — there is no "all submissions"
   *  endpoint, so approved/rejected history cannot be listed. See docs/BACKEND_GAPS.md. */
  async listPending(params?: SubmissionPageParams): Promise<PageResponse<TranslationSubmission>> {
    const res = await httpClient.get<PageResponse<TranslationSubmission>>("/api/v1/admin/submissions/pending", { params });
    return res.data;
  },
  async listMine(params?: SubmissionPageParams): Promise<PageResponse<TranslationSubmission>> {
    const res = await httpClient.get<PageResponse<TranslationSubmission>>("/api/v1/submissions", { params });
    return res.data;
  },
  async get(id: string): Promise<TranslationSubmission> {
    const res = await httpClient.get<TranslationSubmission>(`/api/v1/admin/submissions/${id}`);
    return res.data;
  },
  /** The approve endpoint returns an envelope, not the bare submission — the reviewed
   *  submission is on `.submission`, plus `conceptId` and a `translationsSaved` list. */
  async approve(id: string, payload: SubmissionReviewRequest): Promise<SubmissionApproveResponse> {
    const res = await httpClient.post<SubmissionApproveResponse>(
      `/api/v1/admin/submissions/${id}/approve`,
      payload,
    );
    return res.data;
  },
  async approveAll(): Promise<SubmissionApproveAllResponse> {
    const res = await httpClient.post<SubmissionApproveAllResponse>(
      "/api/v1/admin/submissions/approve-all",
      undefined,
    );
    return res.data;
  },
  async reject(id: string, payload: SubmissionReviewRequest): Promise<TranslationSubmission> {
    const res = await httpClient.post<TranslationSubmission>(
      `/api/v1/admin/submissions/${id}/reject`,
      payload,
    );
    return res.data;
  },
};

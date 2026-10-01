import { httpClient } from "./client";
import type {
  ContactMessage,
  ContactMessageReplyRequest,
  ContactMessageReplyResponse,
  ContactMessageStatistics,
  ContactMessageStatus,
  ContactMessageStatusUpdateResponse,
  PageResponse,
} from "@/types/api";

export interface ContactMessageListParams {
  page?: number;
  size?: number;
  status?: ContactMessageStatus | "ALL";
  search?: string;
}

export const contactMessagesApi = {
  /**
   * List contact messages with optional filtering by status and search query.
   * Handles both Spring Data PageResponse or plain array responses safely.
   */
  async list(params?: ContactMessageListParams): Promise<PageResponse<ContactMessage> | ContactMessage[]> {
    const res = await httpClient.get<PageResponse<ContactMessage> | ContactMessage[]>(
      "/api/v1/admin/contact-messages",
      {
        params: {
          page: params?.page,
          size: params?.size,
          status: params?.status && params.status !== "ALL" ? params.status : undefined,
          search: params?.search ? params.search : undefined,
        },
      },
    );
    return res.data;
  },

  /**
   * Get single contact message details.
   * If markRead is true (default) and message is PENDING, status is changed to READ automatically.
   */
  async get(id: string, markRead = true): Promise<ContactMessage> {
    const res = await httpClient.get<ContactMessage>(`/api/v1/admin/contact-messages/${id}`, {
      params: { markRead },
    });
    return res.data;
  },

  /**
   * Send an email reply to the contact message sender.
   * Sets status to REPLIED and records repliedBy, repliedByUserId, repliedAt.
   */
  async reply(id: string, payload: ContactMessageReplyRequest): Promise<ContactMessageReplyResponse> {
    const res = await httpClient.post<ContactMessageReplyResponse>(
      `/api/v1/admin/contact-messages/${id}/reply`,
      payload,
    );
    return res.data;
  },

  /**
   * Manually update the message status (e.g. PENDING, READ, REPLIED, ARCHIVED).
   */
  async updateStatus(id: string, status: ContactMessageStatus): Promise<ContactMessageStatusUpdateResponse> {
    const res = await httpClient.put<ContactMessageStatusUpdateResponse>(
      `/api/v1/admin/contact-messages/${id}/status`,
      { status },
    );
    return res.data;
  },

  /**
   * Get dashboard statistics breakdown for contact messages.
   */
  async getStatistics(): Promise<ContactMessageStatistics> {
    const res = await httpClient.get<ContactMessageStatistics>("/api/v1/admin/contact-messages/statistics");
    return res.data;
  },

  /**
   * Delete a contact message inquiry (ROLE_ADMIN only).
   */
  async remove(id: string): Promise<{ message: string }> {
    const res = await httpClient.delete<{ message: string }>(`/api/v1/admin/contact-messages/${id}`);
    return res.data;
  },
};

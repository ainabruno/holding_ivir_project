import axios from "axios";

const api = axios.create({
  baseURL: "",
  withCredentials: true,
});

export const pythonApi = {
  async listDocuments(params: {
    limit?: number;
    offset?: number;
    search?: string;
    source?: string;
    verdict?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const res = await api.get("/api/legal/documents", { params });
    return res.data;
  },

  async getStatistics() {
    const res = await api.get("/api/legal/statistics");
    return res.data;
  },

  async triggerScraping(source: string) {
    const res = await api.post("/api/admin/trigger-scraping", { source });
    return res.data;
  },

  async triggerExtraction(documentIds?: number[]) {
    const res = await api.post("/api/admin/trigger-extraction", { document_ids: documentIds });
    return res.data;
  },

  async me() {
    try {
      const res = await api.get("/api/auth/me");
      return res.data;
    } catch {
      return null;
    }
  },

  async logout() {
    const res = await api.post("/api/auth/logout");
    return res.data;
  }
};

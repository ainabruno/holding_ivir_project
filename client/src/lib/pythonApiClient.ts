import axios from "axios";

const ADMIN_TOKEN_KEY = "holding-ivir-admin-token";

const api = axios.create({
  baseURL: import.meta.env.VITE_PYTHON_API_URL || "",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const pythonApi = {
  async authenticateAdmin(token: string) {
    if (typeof window !== "undefined") window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    try {
      return await this.me();
    } catch (error) {
      if (typeof window !== "undefined") window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      throw error;
    }
  },

  clearAdminToken() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  },

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

  async triggerScraping(source: string, url: string) {
    const res = await api.post("/api/admin/trigger-scraping", { source, url });
    return res.data;
  },

  async triggerExtraction(documentIds?: number[]) {
    const res = await api.post("/api/admin/trigger-extraction", { document_ids: documentIds });
    return res.data;
  },

  async getAdminStatus() {
    const res = await api.get("/api/admin/status");
    return res.data as {
      mistral_configured: boolean;
      legifrance_configured: boolean;
      admin_protection_enabled: boolean;
      environment: string;
    };
  },

  async getLegifranceStatus() {
    const res = await api.get("/api/admin/legifrance/status");
    return res.data as { configured: boolean; apiBaseUrl: string; environment: string };
  },

  async pingLegifrance() {
    const res = await api.post("/api/admin/legifrance/ping");
    return res.data;
  },

  async searchLegifrance(payload: {
    keywords: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) {
    const res = await api.post("/api/admin/legifrance/search", payload);
    return res.data as {
      success: boolean;
      source: string;
      keywords: string;
      results_received: number;
      documents_added: number;
      documents_enriched: number;
      message: string;
    };
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

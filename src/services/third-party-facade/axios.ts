import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
// Lazy import to avoid circular dependency:
// errors-store → sonner + zustand (no axios import)
// axios → errors-store (one-way, safe)
import { useErrorsStore } from "@/services/stores/errors-store";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export const httpClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message ?? error.message;
      const url = error.config?.url ?? "unknown";

      // Push to errors store BEFORE rejecting so the record is available
      // immediately at call sites. The rejection still propagates unchanged.
      useErrorsStore.getState().push({
        severity: "error",
        source: "network",
        message,
        detail: String(error.stack ?? error.message),
        context: { status, url },
      });

      return Promise.reject({ status, message, cause: error });
    }
    return Promise.reject(error);
  },
);

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await httpClient.request<T>(config);
  return data;
}

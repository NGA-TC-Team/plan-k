import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

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
      return Promise.reject({ status, message, cause: error });
    }
    return Promise.reject(error);
  },
);

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await httpClient.request<T>(config);
  return data;
}

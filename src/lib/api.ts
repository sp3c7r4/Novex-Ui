import axios from "axios";
import { BACKEND_URL } from "@/config/constants";
import { useAppStore } from "@/store/useAppStore";

/**
 * Pre-configured Axios instance.
 * - Automatically attaches the auth token from Zustand.
 * - Unwraps the standard `{ timestamp, status, success, data }` envelope
 *   so callers receive `response.data` as the inner `data` payload directly.
 */
const api = axios.create({
  baseURL: BACKEND_URL,
});

// Attach auth token on every request
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap the standard envelope: { success, data: { ... } } → returns the inner `data`
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "success" in body && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    // Error responses follow: { success: false, error: { message } }
    const body = error?.response?.data;
    if (body && typeof body === "object") {
      // Try `error.message` first (your 404/error format), then `data.message`
      const msg =
        body.error?.message ??
        body.data?.message ??
        body.message ??
        "Request failed";
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

export default api;

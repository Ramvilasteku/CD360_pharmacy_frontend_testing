import axios from "axios";

/*
  REACT_APP_QR_API_URL is the only base URL this module reads.
  Not REACT_APP_API_URL (IPD backend, port 5001).
  CRA inlines REACT_APP_* at BUILD time — restart the dev server after
  editing .env.
*/
const API_PORT = process.env.REACT_APP_QR_API_PORT || "5000";

const BASE_URL =
  process.env.REACT_APP_QR_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:${API_PORT}/api`
    : "/api");

if (process.env.NODE_ENV === "development") {
  console.log("[API] base URL:", BASE_URL);
}

/*
  ---- CHANGE THIS IF YOUR APP USES A DIFFERENT KEY ----
  Open another working module's api file (or the login handler) and copy
  whatever key it reads. Common ones: "token", "authToken", "accessToken".
*/
const TOKEN_KEYS = ["token", "authToken", "accessToken", "jwt"];

const readToken = () => {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (value) return value;
  }
  return null;
};

const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the session cookie
});

/*
  Covers both auth styles: withCredentials above handles cookie sessions,
  this handles a Bearer token. Whichever one authMiddleware reads, it
  arrives. Harmless if the server only reads cookies.
*/
API.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }
  return config;
});

// Surface the server's real rejection instead of a bare AxiosError
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[API]",
        error.config?.method?.toUpperCase(),
        error.config?.url,
        "→",
        error.response?.status,
        error.response?.data,
        "| Authorization sent:",
        Boolean(error.config?.headers?.Authorization)
      );
    }
    return Promise.reject(error);
  }
);

/* ---------- QR (admin side) ---------- */

export const getMyQR = () => API.get("/qr/my-qr");
export const generateQR = () => API.post("/qr/generate", {});

/* ---------- Forms (patient side) ---------- */

export const getFormById = (adminId, formId) => {
  return API.get(`/forms/${adminId}/${formId}`);
};

export const getFormByQR = (token) => {
  return API.get(`/forms/qr/${token}`);
};

export const lookupClient = (token, body) => {
  return API.post(`/forms/qr/${token}/client`, body);
};

// Api.js — next to lookupClient
export const checkEmail = (token, email) => {
  return API.post(`/forms/qr/${token}/check-email`, { email });
};

export const submitForm = (payload) => {
  return API.post("/forms/submit", payload);
};

export default API;
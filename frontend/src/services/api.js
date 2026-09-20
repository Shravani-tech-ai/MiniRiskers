import axios from "axios";

export const AUTH_TOKEN_KEY = "miniriskers_auth_token";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token) {
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }
}

export function clearAuthToken() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  delete api.defaults.headers.common.Authorization;
}

const existingToken = sessionStorage.getItem(AUTH_TOKEN_KEY);
if (existingToken) {
  api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthToken();
      const publicPaths = ["/", "/login", "/signup"];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;

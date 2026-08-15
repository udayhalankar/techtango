import axios from "axios";
import {
  getAuthToken,
  handleAuthError,
  markSessionActivity,
} from "../auth/sessionManager";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  timeout: 180000,
});

api.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    markSessionActivity();
    config.headers["x-last-activity"] = Date.now().toString();
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => handleAuthError(error)
);

export default api;


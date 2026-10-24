import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Turn any axios error into a readable message (never an object/array, which React cannot render).
export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err.response) {
    const base = api.defaults.baseURL;
    return "Cannot reach the server at " + base + ". Make sure the backend is running (uvicorn main:app) and try again.";
  }
  const detail = err.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
    return (field ? field + ": " : "") + (first.msg || "Invalid input");
  }
  if (err.response.status >= 500) return "The server hit an error. Check the backend terminal for details.";
  return fallback;
}

export default api;

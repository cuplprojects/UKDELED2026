import { create } from "zustand";
import { api } from "./apiStore";
import { isTokenExpired } from "../utils/jwt";

// Verify initial token validity
const initialToken = localStorage.getItem("token") || null;
const isExpired = initialToken ? isTokenExpired(initialToken) : true;

if (initialToken && isExpired) {
  localStorage.removeItem("token");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("username");
}

export const useAuthStore = create((set, get) => ({
  token: isExpired ? null : initialToken,
  isAuthenticated: !isExpired,
  loading: false,
  error: null,

  login: async (registrationNo, password, recaptchaToken) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/api/Login", {
        registrationNo,
        password,
        recaptchaToken: recaptchaToken || "",
      });

      const { token } = response.data;
      
      localStorage.setItem("token", token);

      set({
        token,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || "Invalid credentials.";
      set({ error: errMsg, loading: false });
      return { success: false, error: errMsg };
    }
  },

  adminLogin: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post("/api/Admin/login", {
        username,
        password,
      });

      const { token, username: returnedUsername } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("isAdmin", "true");
      if (returnedUsername) {
        localStorage.setItem("username", returnedUsername);
      }

      set({
        token,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data || "Invalid admin credentials.";
      set({ error: errMsg, loading: false });
      return { success: false, error: errMsg };
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("username");
    set({
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));

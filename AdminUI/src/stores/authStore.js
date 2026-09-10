import { create } from "zustand";
import { api } from "./apiStore";
import { isTokenExpired } from "../utils/jwt";

// Verify initial token validity
const initialToken = sessionStorage.getItem("token") || null;
const isExpired = initialToken ? isTokenExpired(initialToken) : true;

if (initialToken && isExpired) {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("isAdmin");
  sessionStorage.removeItem("username");
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
      
      sessionStorage.setItem("token", token);

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
      
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("isAdmin", "true");
      if (returnedUsername) {
        sessionStorage.setItem("username", returnedUsername);
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
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("isAdmin");
    sessionStorage.removeItem("username");
    set({
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));

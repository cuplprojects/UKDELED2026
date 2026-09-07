import { create } from "zustand";
import axios from "axios";
import { isTokenExpired } from "../utils/jwt";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const USER_API_BASE_URL = import.meta.env.VITE_USER_API_URL || "";

// Configure a default axios client that reads env variable
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Configure a secondary axios client for the User API (for PDF/uploads)
export const userApi = axios.create({
  baseURL: USER_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

console.log('[API Store] Initialized with baseURL:', API_BASE_URL);
console.log('[API Store] Initialized with userBaseURL:', USER_API_BASE_URL);

// Function to handle logout and redirect
const handleAuthFailure = () => {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  localStorage.removeItem("token");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("username");
  // Force a hard redirect or window reload to reset the application state
  window.location.href = isAdmin ? "/admin/login" : "/";
};

// Request interceptor to automatically attach JWT token from authStore
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    if (isTokenExpired(token)) {
      console.warn("[API] Token has expired. Logging out...");
      handleAuthFailure();
      return Promise.reject(new Error("Token expired"));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  console.error('[API] Request interceptor error:', error);
  return Promise.reject(error);
});

// Request interceptor for userApi
userApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    if (isTokenExpired(token)) {
      console.warn("[User API] Token has expired. Logging out...");
      handleAuthFailure();
      return Promise.reject(new Error("Token expired"));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[User API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  console.error('[User API] Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor for logging & auth failure handling
// api.interceptors.response.use(
//   (response) => {
//     console.log(`[API] Response ${response.status} from ${response.config.url}`);
//     return response;
//   },
//   (error) => {
//     console.error(`[API] Error ${error.response?.status} from ${error.config?.url}:`, error.message);
    
//     // Check if the server is unreachable or down
//     const isNetworkError = !error.response;
//     const isServerDown = error.response && (error.response.status === 502 || error.response.status === 503 || error.response.status === 504);
    
//     if (isNetworkError || isServerDown) {
//       console.error("[API] Server is unreachable or down. Redirecting to maintenance page...");
//       window.location.href = "/test/under-maintenance";
//       return Promise.reject(error);
//     }

//     if (error.response?.status === 401) {
//       console.warn("[API] Received 401 Unauthorized. Logging out...");
//       handleAuthFailure();
//     }
//     return Promise.reject(error);
//   }
// );

export const useApiStore = create((set) => ({
  loading: false,
  error: null,
  success: null,

  sendOtp: async (fullName, fatherName, phoneNumber, email, recaptchaToken, userId) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await api.post("/api/UserRegistrations/Register", {
        fullName,
        fatherName,
        phoneNumber,
        email,
        recaptchaToken: recaptchaToken || "",
        userId: userId || null,
      });
      const registeredUserId = response.data.userId;
      set({ loading: false, success: response.data.message || "OTP sent successfully." });
      return { success: true, userId: registeredUserId };
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to send OTP.";
      set({ loading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  resendOtp: async (userId) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await api.post("/api/UserRegistrations/ResendOTP", {
        userId,
      });
      set({ loading: false, success: response.data.message || "OTP resent successfully." });
      return { success: true };
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to resend OTP.";
      set({ loading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  verifyOtp: async (userId, mobileOtp, emailOtp) => {
    set({ loading: true, error: null, success: null });
    try {
      const response = await api.post("/api/UserRegistrations/VerifyMobileOTP", {
        userId,
        mobileOtp: typeof mobileOtp === "string" ? mobileOtp : "",
        emailOtp: typeof emailOtp === "string" ? emailOtp : "",
        otp: typeof mobileOtp === "string" ? mobileOtp : "",
      });
      
      // Save token to localStorage after successful OTP verification
      if (response.data && response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      
      set({ loading: false, success: response.data.message || "OTP verified successfully." });
      return { success: true, token: response.data.token };
    } catch (err) {
      const errMsg = err.response?.data?.message || "OTP verification failed.";
      set({ loading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },
}));

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";
import { api } from "../stores/apiStore";

const AdminProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  const [isValidating, setIsValidating] = useState(true);
  const [isValidAdmin, setIsValidAdmin] = useState(false);

  useEffect(() => {
    const validateTokenOnServer = async () => {
      if (!token || isTokenExpired(token)) {
        setIsValidAdmin(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await api.get("/api/Admin/validate");
        if (response.data && response.data.isAdmin) {
          setIsValidAdmin(true);
        } else {
          setIsValidAdmin(false);
        }
      } catch (err) {
        console.error("Admin validation failed:", err);
        setIsValidAdmin(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateTokenOnServer();
  }, [token]);

  if (!token || isTokenExpired(token)) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("isAdmin");
    sessionStorage.removeItem("username");
    return <Navigate to="/admin/login" replace />;
  }

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm font-normal">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isValidAdmin) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("isAdmin");
    sessionStorage.removeItem("username");
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AdminProtectedRoute;

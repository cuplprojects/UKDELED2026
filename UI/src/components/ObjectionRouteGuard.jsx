import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../stores/apiStore";
import { isTokenExpired } from "../utils/jwt";

const ObjectionRouteGuard = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState({
    isOpen: true,
  });

  useEffect(() => {
    const checkTimeline = async () => {
      try {
        const res = await api.get("/api/Objection/timeline-status");
        if (res.data) {
          setTimeline(res.data);
        }
      } catch (err) {
        console.error("Failed to check objection timeline status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkTimeline();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 py-16 px-4 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-gray-500 font-medium text-xs">Loading...</p>
      </div>
    );
  }

  if (!timeline.isOpen) {
    const token = sessionStorage.getItem("token");
    const isLoggedIn = token && !isTokenExpired(token);
    return <Navigate to={isLoggedIn ? "/application" : "/"} replace />;
  }

  return children;
};

export default ObjectionRouteGuard;

import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin");

  if (token && isTokenExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("username");
    return <Navigate to="/" replace />;
  }

  // Redirect admin users to admin dashboard if they try to access candidate pages
  if (token && isAdmin === "true") {
    return <Navigate to="/admin" replace />;
  }

  // Redirect unauthenticated users to home login page
  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

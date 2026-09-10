import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  const isAdmin = sessionStorage.getItem("isAdmin");

  if (token && isTokenExpired(token)) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("isAdmin");
    sessionStorage.removeItem("username");
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

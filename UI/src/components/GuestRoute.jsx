import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";

const GuestRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const isAdmin = localStorage.getItem("isAdmin");

  if (token) {
    if (isTokenExpired(token)) {
      localStorage.removeItem("token");
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("username");
      return children;
    }
    
    if (isAdmin === "true") {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/application" replace />;
  }

  return children;
};

export default GuestRoute;

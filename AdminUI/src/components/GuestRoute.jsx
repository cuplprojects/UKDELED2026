import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/jwt";

const GuestRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  const isAdmin = sessionStorage.getItem("isAdmin");

  if (token) {
    if (isTokenExpired(token)) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("isAdmin");
      sessionStorage.removeItem("username");
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

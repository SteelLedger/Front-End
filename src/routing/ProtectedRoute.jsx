import { Navigate, Outlet } from "react-router-dom";

/**
 * ProtectedRoute
 * Reads the auth token from localStorage.
 * If no token is found, redirects to /login.
 * Replace the token check with your actual auth context/store if needed.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

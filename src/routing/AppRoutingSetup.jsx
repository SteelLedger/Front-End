import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Login from "../auth/pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../layouts/Layout";
import Dashboard from "../pages/Dashboard";
import Parties from "../pages/Parties";
import ComingSoon from "../pages/ComingSoon";
import NotFound from "../pages/NotFound";

const router = createBrowserRouter([
  // Public route
  {
    path: "/login",
    element: <Login />,
  },

  // Root redirect
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },

  // Protected routes — wrapped in ProtectedRoute (auth check),
  // then Layout (sidebar + topbar), then the individual page.
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: "/dashboard",
            element: <Dashboard />,
          },
          {
            path: "/parties",
            element: <Parties />,
          },
          // Modules not built yet — placeholders so QA doesn't hit blank screens.
          {
            path: "/items",
            element: <ComingSoon title="Items" />,
          },
          {
            path: "/sales",
            element: <ComingSoon title="Sales" />,
          },
          {
            path: "/purchase",
            element: <ComingSoon title="Purchase" />,
          },
          {
            path: "/reports",
            element: <ComingSoon title="Reports" />,
          },
          {
            path: "/settings",
            element: <ComingSoon title="Settings" />,
          },
          // 404 — any unknown path inside the app shell.
          {
            path: "*",
            element: <NotFound />,
          },
        ],
      },
    ],
  },
]);

const AppRoutingSetup = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutingSetup;

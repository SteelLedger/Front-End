import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Login from "../auth/pages/Login";
import ForgotPassword from "../auth/pages/ForgotPassword";
import ProtectedRoute from "./ProtectedRoute";
import Layout from "../layouts/Layout";
import Dashboard from "../pages/Dashboard";
import Parties from "../pages/Parties";
import Purchase from "../pages/Purchase";
import Sales from "../pages/Sales";
import Inventory from "../pages/Inventory";
import RawMaterialPurchases from "../pages/RawMaterialPurchases";
import Product from "../pages/Product";
import ProductInventory from "../pages/ProductInventory";
import Members from "../pages/Members";
import Settings from "../pages/Settings";
import ComingSoon from "../pages/ComingSoon";
import NotFound from "../pages/NotFound";

const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <Login />,
  },
  // Email -> OTP -> new password. The steps share one route: the OTP and the
  // reset token only live in memory, so a deep link to a later step is dead.
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
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
          {
            path: "/product",
            element: <Product />,
          },
          {
            path: "/product-inventory",
            element: <ProductInventory />,
          },
          {
            path: "/inventory",
            element: <Inventory />,
          },
          // Purchases behind one raw-material inventory row.
          {
            path: "/inventory/:id",
            element: <RawMaterialPurchases />,
          },
          // Redirect the old Items path to the new Product page.
          {
            path: "/items",
            element: <Navigate to="/product" replace />,
          },
          {
            path: "/purchase",
            element: <Purchase />,
          },
          {
            path: "/sales",
            element: <Sales />,
          },
          // Modules not built yet — placeholders so QA doesn't hit blank screens.
          {
            path: "/reports",
            element: <ComingSoon title="Reports" />,
          },
          // Team members — admin-only in practice; the page itself shows a
          // locked state for anyone else who reaches it by URL.
          {
            path: "/members",
            element: <Members />,
          },
          {
            path: "/settings",
            element: <Settings />,
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

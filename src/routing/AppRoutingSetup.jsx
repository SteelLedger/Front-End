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
import Purchase from "../pages/Purchase";
import Inventory from "../pages/Inventory";
import Product from "../pages/Product";
import ProductInventory from "../pages/ProductInventory";
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
          // Redirect the old Items path to the new Product page.
          {
            path: "/items",
            element: <Navigate to="/product" replace />,
          },
          {
            path: "/purchase",
            element: <Purchase />,
          },
          // Modules not built yet — placeholders so QA doesn't hit blank screens.
          {
            path: "/sales",
            element: <ComingSoon title="Sales" />,
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

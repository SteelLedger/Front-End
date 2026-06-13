import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Login from "../auth/pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "../pages/Dashboard";
// import Inventory from "../pages/Inventory";
// import Orders from "../pages/Orders";
// import Profile from "../pages/Profile";
// import Reports from "../pages/Reports";
// import NotFound from "../pages/NotFound";

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

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      //   {
      //     path: "/inventory",
      //     element: <Inventory />,
      //   },
      //   {
      //     path: "/orders",
      //     element: <Orders />,
      //   },
      //   {
      //     path: "/profile",
      //     element: <Profile />,
      //   },
      //   {
      //     path: "/reports",
      //     element: <Reports />,
      //   },
    ],
  },

  // 404 fallback
  //   {
  //     path: "*",
  //     element: <NotFound />,
  //   },
]);

const AppRoutingSetup = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutingSetup;

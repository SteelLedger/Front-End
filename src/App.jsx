import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutingSetup from "./routing/AppRoutingSetup";

const App = () => {
  return (
    <>
      <AppRoutingSetup />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
      />
    </>
  );
};

export default App;

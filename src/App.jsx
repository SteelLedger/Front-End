import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRoutingSetup from "./routing/AppRoutingSetup";
import { RawMaterialProvider } from "./context/RawMaterialProvider";

const App = () => {
  return (
    <RawMaterialProvider>
      <AppRoutingSetup />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        theme="colored"
      />
    </RawMaterialProvider>
  );
};

export default App;

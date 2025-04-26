import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { VnProvider } from "./context/vn-context";

createRoot(document.getElementById("root")!).render(
  <VnProvider>
    <App />
  </VnProvider>
);

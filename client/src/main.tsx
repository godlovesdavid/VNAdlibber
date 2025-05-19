import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // Import i18next configuration
import { initializeLanguageHandling } from "./utils/language-util";

// Initialize language handling to enable automatic translation across all pages
initializeLanguageHandling();

createRoot(document.getElementById("root")!).render(
  <App />
);

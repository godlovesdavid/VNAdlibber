import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import i18next from "i18next";
import "./i18n"; // Import i18next configuration

// Ensure translations work across all pages by subscribing to language changes
i18next.on('languageChanged', (language: string) => {
  console.log(`Language changed to: ${language}`);
  
  // Delay slightly to ensure DOM is ready
  setTimeout(() => {
    // Check if auto-translate is enabled
    const autoTranslate = localStorage.getItem('vn-auto-translate') === 'true';
    const sourceLanguage = localStorage.getItem('vn-auto-translate-source') || 'en';
    
    if (autoTranslate && language !== sourceLanguage) {
      console.log(`Auto-translating fields to ${language}...`);
      
      // Trigger global custom event that components can listen for
      const event = new CustomEvent('language-changed', { detail: { language } });
      document.dispatchEvent(event);
    }
  }, 100);
});

createRoot(document.getElementById("root")!).render(
  <App />
);

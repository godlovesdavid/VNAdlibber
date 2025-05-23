import { TranslationManager } from "@/components/translation-manager";
import { NavBar } from "@/components/nav-bar";
import { useTranslation } from "react-i18next";
import {  useEffect } from "react";
import { useLocation } from "wouter";
export default function TranslationSettingsPage() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();

  //return button
  useEffect(() => {
    const returnButtonHandler = () => {
        setLocation("/")
    }
    document.addEventListener("return", returnButtonHandler);
    return () => {
      document.removeEventListener("return", returnButtonHandler);
    };
  }, []);

  return (
    <>
      <NavBar />
      <div className="container max-w-4xl mx-auto pt-24 px-4 pb-10">
        <h1 className="text-2xl font-semibold mb-6">{t('translationSettings.title', 'Translation Settings')}</h1>
        <p className="text-gray-600 mb-8">
          {t('translationSettings.description', 'Manage translations for your visual novel application. Connect with DeepL to automatically translate missing keys in your language files.')}
        </p>
        
        <TranslationManager />
      </div>
    </>
  );
}
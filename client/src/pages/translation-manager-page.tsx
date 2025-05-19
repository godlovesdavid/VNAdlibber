import { NavBar } from '@/components/nav-bar';
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TranslationManager } from '@/components/translation-manager';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet';

export default function TranslationManagerPage() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();

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
      <Helmet>
        <title>{t('translation.manager.title', 'Translation Manager')}</title>
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <NavBar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            {t('translation.manager.header', 'Translation Manager')}
          </h1>
          
          <p className="mb-6 text-gray-700">
            {t('translation.manager.description', 
              'Use this tool to automatically translate your visual novel content into multiple languages.')}
          </p>
          
          <TranslationManager />
        </main>
      </div>
    </>
  );
}
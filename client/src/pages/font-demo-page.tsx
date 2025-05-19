
import { useTranslation } from "react-i18next";
import { NavBar } from "@/components/nav-bar";
import { FontDemo } from "@/components/font-demo";

export default function FontDemoPage() {
  const { t } = useTranslation();
  
  return (
    <>
      <NavBar />
      <main className="container mx-auto p-4 pt-24">
        <h1 className="text-2xl font-semibold mb-6">{t('fontDemo.title', 'Font Demo')}</h1>
        <p className="text-gray-600 mb-8">{t('fontDemo.description', 'This page demonstrates various font styles and weights available in the application.')}</p>
        <FontDemo />
      </main>
    </>
  );
}

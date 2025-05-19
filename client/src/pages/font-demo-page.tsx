import { FontDemo } from "@/components/font-demo";
import { NavBar } from "@/components/nav-bar";
import { useTranslation } from "react-i18next";

export function FontDemoPage() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen">
      <NavBar />
      <FontDemo />
    </div>
  );
}

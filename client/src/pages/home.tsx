import { MainMenu } from "@/components/main-menu";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  return <MainMenu />;
}

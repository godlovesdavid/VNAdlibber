import { useVnContext } from "@/context/vn-context";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
export function SaveProjectButton() {
  const { t } = useTranslation();
  const { saveLoading } = useVnContext();

  const handleSave = async () => {
      document.dispatchEvent(new CustomEvent('save'));
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={saveLoading}
      className="border-primary text-primary hover:bg-primary/10"
    >
      {saveLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {t('common.saving', 'Saving...')}
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-1" />
          {t('common.saveProject', 'Save Project')}
        </>
      )}
    </Button>
  );
}
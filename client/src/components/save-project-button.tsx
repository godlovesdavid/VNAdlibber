import { useVnContext } from "@/context/vn-context";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export function SaveProjectButton() {
  const { 
    saveProject, 
    saveLoading,
    projectData,
    setBasicData,
    setConceptData,
    setCharactersData,
    setPathsData,
    setPlotData,
  } = useVnContext();
  
  const [location] = useLocation();
  
  // Function to save the current form's data based on the current location
  const saveCurrentFormData = async () => {
    // Get the current page information from the form that's open
    const formPath = location.split('/').pop();
    
    // Try to find form elements on the current page
    if (formPath === 'basic') {
      // This could gather data from the basic form
      const themeInput = document.querySelector('input[name="theme"]') as HTMLInputElement;
      const toneInput = document.querySelector('input[name="tone"]') as HTMLInputElement;
      const genreInput = document.querySelector('input[name="genre"]') as HTMLInputElement;
      const settingInput = document.querySelector('input[name="setting"]') as HTMLInputElement;
      
      // If we found form inputs, update the context with their values
      if (themeInput && toneInput && genreInput) {
        setBasicData({
          theme: themeInput.value,
          tone: toneInput.value,
          genre: genreInput.value,
          setting: settingInput?.value || undefined,
        });
      }
    } else if (formPath === 'concept') {
      // Get concept form data
      const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement;
      const taglineInput = document.querySelector('input[name="tagline"]') as HTMLInputElement;
      const premiseTextarea = document.querySelector('textarea[name="premise"]') as HTMLTextAreaElement;
      
      if (titleInput && taglineInput && premiseTextarea) {
        setConceptData({
          title: titleInput.value,
          tagline: taglineInput.value,
          premise: premiseTextarea.value,
        });
      }
    } else if (formPath === 'characters') {
      // Characters form has its own save function which is called in handleNext/handleBack
      // We can't easily access the form state from here, but the form will save automatically
      // when next/back is clicked. Let's add a message to inform users.
      console.log('Note: Character data will be saved when using Next/Back buttons');
    } else if (formPath === 'paths') {
      // Paths form also handles its own saving in Next/Back
      console.log('Note: Path data will be saved when using Next/Back buttons');
    } else if (formPath === 'plot') {
      // Plot form has its own save function
      console.log('Note: Plot data will be saved when using Next/Back buttons');
    }
  };
  
  const handleSave = async () => {
    // First, try to save the current form's data
    await saveCurrentFormData();
    
    // Then save the whole project
    await saveProject();
    
    // Let the user know the save includes current page data
    console.log('Project saved including current form data');
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
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-1" />
          Save Project
        </>
      )}
    </Button>
  );
}

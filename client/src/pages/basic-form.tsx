import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function BasicForm() {
  const [, setLocation] = useLocation();
  const { projectData, setBasicData } = useVnContext();

  // Use state with empty default values
  const [theme, setTheme] = useState("");
  const [tone, setTone] = useState("");
  const [genre, setGenre] = useState("");
  const [setting, setSetting] = useState("");

  // Function to reset the form
  const resetForm = () => {
    console.log("Resetting form values");
    setTheme("");
    setTone("");
    setGenre("");
    setSetting("");
  };

  // Load or reset form values based on projectData
  useEffect(() => {
    console.log("Project data changed:", projectData?.basicData);

    // Check if we need to reset (flag from createNewProject)
    const isNewProject = sessionStorage.getItem("vn_fresh_project") === "true";
    if (isNewProject) {
      console.log("New project flag found, resetting form");
      sessionStorage.removeItem("vn_fresh_project");
      resetForm();
      return;
    }

    // If we have project data, use it
    if (projectData?.basicData) {
      console.log("Loading existing project data", projectData.basicData);
      setTheme(projectData.basicData.theme || "");
      setTone(projectData.basicData.tone || "");
      setGenre(projectData.basicData.genre || "");
      setSetting(projectData.basicData.setting || "");
    } else {
      // Otherwise clear the form
      console.log("No project data found, resetting form");
      resetForm();
    }
  }, [projectData?.basicData]);

  // Go back to main menu
  const goBack = () => {
    setLocation("/");
  };

  // Manual reset for debugging
  const handleManualReset = () => {
    console.log("Manual reset requested");

    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear form state
    resetForm();

    // Show confirmation
    window.alert("Form values manually reset. The page will now refresh.");

    // Force a complete refresh of the page
    window.location.href = "/";
  };

  // Proceed to next step
  const handleNext = () => {
    // Validate form
    if (!theme || !tone || !genre || !setting) {
      alert("Please fill in all required fields");
      return;
    }

    // Save data
    setBasicData({
      theme,
      tone,
      genre,
      setting,
    });

    // Navigate to next step
    setLocation("/create/concept");
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={1} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Step 1: Basic Elements
          </h2>
          <p className="text-gray-600 mb-6">
            Select the fundamental elements that will define your visual novel's
            world and atmosphere.
          </p>

          <div className="space-y-8">
            {/* Sentence-style form with dropdowns */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-medium text-gray-700 mb-6">Create Your Story</h3>
              
              <div className="text-lg leading-relaxed space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-700">Compose me a</span>
                  
                  {/* Tone Dropdown */}
                  <div className="inline-block">
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="w-36 h-8 text-base border-b-2 border-blue-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adventurous">adventurous</SelectItem>
                        <SelectItem value="dark">dark</SelectItem>
                        <SelectItem value="gritty">gritty</SelectItem>
                        <SelectItem value="lighthearted">lighthearted</SelectItem>
                        <SelectItem value="melancholic">melancholic</SelectItem>
                        <SelectItem value="romantic">romantic</SelectItem>
                        <SelectItem value="satirical">satirical</SelectItem>
                        <SelectItem value="suspenseful">suspenseful</SelectItem>
                        <SelectItem value="tragicomic">tragicomic</SelectItem>
                        <SelectItem value="whimsical">whimsical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Genre Dropdown */}
                  <div className="inline-block">
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="w-36 h-8 text-base border-b-2 border-green-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="genre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cyberpunk">cyberpunk</SelectItem>
                        <SelectItem value="steampunk">steampunk</SelectItem>
                        <SelectItem value="mystery">mystery</SelectItem>
                        <SelectItem value="romance">romance</SelectItem>
                        <SelectItem value="science_fiction">sci-fi</SelectItem>
                        <SelectItem value="fantasy">fantasy</SelectItem>
                        <SelectItem value="slice_of_life">slice of life</SelectItem>
                        <SelectItem value="thriller">thriller</SelectItem>
                        <SelectItem value="comedy">comedy</SelectItem>
                        <SelectItem value="horror">horror</SelectItem>
                        <SelectItem value="drama">drama</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <span className="text-gray-700">about</span>
                  
                  {/* Theme Dropdown */}
                  <div className="inline-block">
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="w-40 h-8 text-base border-b-2 border-purple-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forgiveness">forgiveness</SelectItem>
                        <SelectItem value="freedom_vs_control">freedom vs control</SelectItem>
                        <SelectItem value="growth">growth</SelectItem>
                        <SelectItem value="identity">identity</SelectItem>
                        <SelectItem value="love_vs_duty">love vs duty</SelectItem>
                        <SelectItem value="revenge_and_justice">revenge & justice</SelectItem>
                        <SelectItem value="technology_vs_humanity">tech vs humanity</SelectItem>
                        <SelectItem value="sacrifice">sacrifice</SelectItem>
                        <SelectItem value="trust_and_betrayal">trust & betrayal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <span className="text-gray-700">set in</span>
                  
                  {/* Setting Dropdown */}
                  <div className="inline-block">
                    <Select value={setting} onValueChange={setSetting}>
                      <SelectTrigger className="w-40 h-8 text-base border-b-2 border-amber-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="setting" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cyberpunk_world">cyberpunk world</SelectItem>
                        <SelectItem value="steampunk_world">steampunk world</SelectItem>
                        <SelectItem value="noir_setting">noir setting</SelectItem>
                        <SelectItem value="modern_day">modern day</SelectItem>
                        <SelectItem value="school">school</SelectItem>
                        <SelectItem value="history">history</SelectItem>
                        <SelectItem value="mythology">mythology</SelectItem>
                        <SelectItem value="space">space</SelectItem>
                        <SelectItem value="dystopia">dystopia</SelectItem>
                        <SelectItem value="utopia">utopia</SelectItem>
                        <SelectItem value="urban_city">urban city</SelectItem>
                        <SelectItem value="scary_place">a scary place</SelectItem>
                        <SelectItem value="countryside">countryside</SelectItem>
                        <SelectItem value="post_apocalypse">post-apocalypse</SelectItem>
                        <SelectItem value="virtual_reality">virtual reality</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview of the selected options */}
            {(theme || tone || genre || setting) && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Preview:</h3>
                <p className="text-gray-700">
                  Composing {tone && <span className="font-medium">{tone}</span>} {genre && <span className="font-medium">{genre}</span>} about {theme && <span className="font-medium">{theme.replace(/_/g, ' ')}</span>} set in {setting && <span className="font-medium">{setting.replace(/_/g, ' ')}</span>}.
                </p>
              </div>
            )}

            <div className="pt-6 flex justify-between">
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={handleNext} disabled={!theme || !tone || !genre || !setting}>
                Next: Concept
              </Button>
            </div>

            {/* Debug button - remove in production */}
            <div className="text-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualReset}
                className="text-xs text-gray-500"
              >
                Reset Form (Debug)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

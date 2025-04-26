import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";

export default function BasicForm() {
  const [, setLocation] = useLocation();
  const { projectData, setBasicData } = useVnContext();
  
  // Form state
  const [theme, setTheme] = useState("");
  const [customTheme, setCustomTheme] = useState("");
  const [tone, setTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [genre, setGenre] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  
  // Load existing data if available
  useEffect(() => {
    if (projectData?.basicData) {
      setTheme(projectData.basicData.theme || "");
      setCustomTheme(projectData.basicData.customTheme || "");
      setTone(projectData.basicData.tone || "");
      setCustomTone(projectData.basicData.customTone || "");
      setGenre(projectData.basicData.genre || "");
      setCustomGenre(projectData.basicData.customGenre || "");
    }
  }, [projectData]);
  
  // Go back to main menu
  const goBack = () => {
    setLocation("/");
  };
  
  // Proceed to next step
  const handleNext = () => {
    // Validate form
    if (!getThemeValue() || !getToneValue() || !getGenreValue()) {
      alert("Please fill in all required fields");
      return;
    }
    
    // Save data
    setBasicData({
      theme: theme,
      customTheme: customTheme,
      tone: tone,
      customTone: customTone,
      genre: genre,
      customGeneric: customGenre,
    });
    
    // Navigate to next step
    setLocation("/create/concept");
  };
  
  // Helper functions to get actual values
  const getThemeValue = () => theme === "custom" ? customTheme : theme;
  const getToneValue = () => tone === "custom" ? customTone : tone;
  const getGenreValue = () => genre === "custom" ? customGenre : genre;
  
  return (
    <>
      <NavBar />
      <CreationProgress currentStep={1} />
      
      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Step 1: Basic Elements</h2>
          <p className="text-gray-600 mb-6">Select the fundamental elements that will define your visual novel's world and atmosphere.</p>
          
          <div className="space-y-6">
            {/* Theme Selection */}
            <div className="form-group">
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
              <p className="text-xs text-gray-500 mb-2">The central ideas explored in your story</p>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity">Identity</SelectItem>
                  <SelectItem value="trust_betrayal">Trust and Betrayal</SelectItem>
                  <SelectItem value="love_duty">Love vs Duty</SelectItem>
                  <SelectItem value="freedom_control">Freedom vs Control</SelectItem>
                  <SelectItem value="revenge_justice">Revenge and Justice</SelectItem>
                  <SelectItem value="technology_humanity">Technology and Humanity</SelectItem>
                  <SelectItem value="sacrifice">Sacrifice</SelectItem>
                  <SelectItem value="corruption">Corruption</SelectItem>
                  <SelectItem value="truth_illusion">Truth vs Illusion</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                  <SelectItem value="custom">Custom Theme...</SelectItem>
                </SelectContent>
              </Select>
              
              {theme === "custom" && (
                <Input
                  id="custom-theme"
                  placeholder="Enter your custom theme"
                  className="mt-2"
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                />
              )}
            </div>
            
            {/* Tone Selection */}
            <div className="form-group">
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <p className="text-xs text-gray-500 mb-2">The emotional atmosphere of your story</p>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lighthearted">Lighthearted</SelectItem>
                  <SelectItem value="melancholic">Melancholic</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="satirical">Satirical</SelectItem>
                  <SelectItem value="suspenseful">Suspenseful</SelectItem>
                  <SelectItem value="whimsical">Whimsical</SelectItem>
                  <SelectItem value="romantic">Romantic</SelectItem>
                  <SelectItem value="tragicomic">Tragicomic</SelectItem>
                  <SelectItem value="adventurous">Adventurous</SelectItem>
                  <SelectItem value="gritty">Gritty</SelectItem>
                  <SelectItem value="custom">Custom Tone...</SelectItem>
                </SelectContent>
              </Select>
              
              {tone === "custom" && (
                <Input
                  id="custom-tone"
                  placeholder="Enter your custom tone"
                  className="mt-2"
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                />
              )}
            </div>
            
            {/* Genre Selection */}
            <div className="form-group">
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <p className="text-xs text-gray-500 mb-2">The category or style of your story</p>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cyberpunk">Cyberpunk</SelectItem>
                  <SelectItem value="steampunk">Steampunk</SelectItem>
                  <SelectItem value="mystery">Mystery</SelectItem>
                  <SelectItem value="romance">Romance</SelectItem>
                  <SelectItem value="science_fiction">Science Fiction</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="slice_of_life">Slice of Life</SelectItem>
                  <SelectItem value="thriller">Thriller</SelectItem>
                  <SelectItem value="comedy">Comedy</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                  <SelectItem value="drama">Drama</SelectItem>
                  <SelectItem value="custom">Custom Genre...</SelectItem>
                </SelectContent>
              </Select>
              
              {genre === "custom" && (
                <Input
                  id="custom-genre"
                  placeholder="Enter your custom genre"
                  className="mt-2"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                />
              )}
            </div>
            
            <div className="pt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={goBack}
              >
                Back
              </Button>
              <Button 
                onClick={handleNext}
              >
                Next: Concept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

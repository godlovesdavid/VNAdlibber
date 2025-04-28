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
  const { projectData, setBasicData, createNewProject } = useVnContext();
  
  // Use state with string default values to avoid TypeScript errors
  const [theme, setTheme] = useState("");
  const [tone, setTone] = useState("");
  const [genre, setGenre] = useState("");
  
  // Add manual reset debug function
  const handleManualReset = () => {
    console.log("Manual reset requested");
    
    // Clear all browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear form state
    setTheme("");
    setTone("");
    setGenre("");
    
    // Reload the page completely
    window.location.href = "/";
  };
  
  // This runs once when the component mounts
  useEffect(() => {
    console.log("BasicForm component mounted");
    
    // Check if we need to clear on mount
    const isNewProject = sessionStorage.getItem("vn_fresh_project") === "true";
    
    if (isNewProject) {
      console.log("Found new project flag, clearing form");
      sessionStorage.removeItem("vn_fresh_project");
      setTheme("");
      setTone("");
      setGenre("");
      return;
    }
    
    // If we have project data, use it
    if (projectData?.basicData) {
      console.log("Loading existing project data", projectData.basicData);
      setTheme(projectData.basicData.theme || "");
      setTone(projectData.basicData.tone || "");
      setGenre(projectData.basicData.genre || "");
    } else {
      // Otherwise clear the form
      console.log("No project data found, clearing form");
      setTheme("");
      setTone("");
      setGenre("");
    }
  }, [projectData?.basicData]);
  
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
      tone: tone,
      genre: genre,
    });
    
    // Navigate to next step
    setLocation("/create/concept");
  };
  
  // Helper functions to get actual values
  const getThemeValue = () => theme;
  const getToneValue = () => tone;
  const getGenreValue = () => genre;
  
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
              <Select 
                key={`theme-${forceUpdateKey}`} 
                value={theme || ""} 
                onValueChange={setTheme}
                defaultValue=""
              >
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
                </SelectContent>
              </Select>
              
            </div>
            
            {/* Tone Selection */}
            <div className="form-group">
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
              <p className="text-xs text-gray-500 mb-2">The emotional atmosphere of your story</p>
              <Select 
                key={`tone-${forceUpdateKey}`} 
                value={tone || ""} 
                onValueChange={setTone}
                defaultValue=""
              >
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
                </SelectContent>
              </Select>
              
            </div>
            
            {/* Genre Selection */}
            <div className="form-group">
              <label htmlFor="genre" className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
              <p className="text-xs text-gray-500 mb-2">The category or style of your story</p>
              <Select 
                key={`genre-${forceUpdateKey}`} 
                value={genre || ""} 
                onValueChange={setGenre}
                defaultValue=""
              >
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
                </SelectContent>
              </Select>
              
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

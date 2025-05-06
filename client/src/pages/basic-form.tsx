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
import { useToast } from "@/hooks/use-toast";
import { validateFormContent } from "@/lib/validation";

// Arrays for each dropdown type
const tones = [
  "humorous",
  "dark",
  "gritty",
  "lighthearted",
  "melancholic",
  "romantic",
  "satirical",
  "suspenseful",
  "tragicomic",
  "uplifting",
  "whimsical",
];

const genres = [
  "mystery",
  "romance",
  "sci_fi",
  "adventure",
  "slice_of_life",
  "thriller",
  "comedy",
  "horror",
  "drama",
];

const themes = [
  "forgiveness",
  "freedom_vs_control",
  "growth",
  "identity",
  "love_vs_duty",
  "revenge_and_justice",
  "technology_vs_humanity",
  "sacrifice",
  "trust_and_betrayal",
];

const settings = [
  "cyberpunk_world",
  "steampunk_world",
  "noir_setting",
  "modern_day",
  "school",
  "history",
  "mythology",
  "space",
  "dystopia",
  "utopia",
  "urban_city",
  "haunted_place",
  "countryside",
  "post_apocalypse",
  "virtual_reality",
];

// Helper function to get a random item from an array
function getRandomItem(array: string[]): string {
  return array[Math.floor(Math.random() * array.length)];
}

export default function BasicForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setBasicData } = useVnContext();
  const { toast } = useToast();

  // Track validation state
  const [isValidating, setIsValidating] = useState(false);

  // Use state with empty default values
  const [theme, setTheme] = useState("");
  const [tone, setTone] = useState("");
  const [genre, setGenre] = useState("");
  const [setting, setSetting] = useState("");

  useEffect(() => {
      if (!theme || !tone || !genre || !setting) return;
      setBasicData({
        theme,
        tone,
        genre,
        setting,
      });
  }, [theme, tone, genre, setting]);

  // Function to randomize all form values
  const randomizeForm = () => {
    console.log("Randomizing form values");
    setTheme(getRandomItem(themes));
    setTone(getRandomItem(tones));
    setGenre(getRandomItem(genres));
    setSetting(getRandomItem(settings));

    setBasicData({
                  theme,
                  tone,
                  genre,
                  setting,
                });
  };

  // Load or reset form values based on projectData
  useEffect(() => {
    console.log("Project data changed:", projectData?.basicData);

    // Check if we need to reset (flag from createNewProject)
    const isNewProject = sessionStorage.getItem("vn_fresh_project") === "true";
    if (isNewProject) {
      console.log("New project flag found, resetting form");
      sessionStorage.removeItem("vn_fresh_project");
      randomizeForm();
      return;
    }

    // If we have project data, use it without randomizing
    if (projectData?.basicData) {
      console.log("Loading existing project data", projectData.basicData);
      setTheme(projectData.basicData.theme || "");
      setTone(projectData.basicData.tone || "");
      setGenre(projectData.basicData.genre || "");
      setSetting(projectData.basicData.setting || "");
    }
  }, [location]);

  // Go back to main menu
  const goBack = () => {
    setLocation("/");
  };

  // Proceed to next step
  const handleNext = async () => {
    // Local validation
    if (!theme || !tone || !genre || !setting) {
      toast({
        title: "Missing Information",
        description: "Please select options for all fields before proceeding.",
        variant: "destructive",
      });
      return;
    }

    try {
      // const isValid = await validateFormContent({ basicData: basicObj }, "basic");
      // if (isValid)
      setLocation("/create/concept");
    } catch (error) {
      toast({
        title: "Validation Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      // setIsValidating(false);
    }
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={1} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-gray-700">
                  Create Your Story
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={randomizeForm}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 2v6h6"></path>
                    <path d="M3 13a9 9 0 0 0 9 9 9 9 0 0 0 6.75-3"></path>
                    <path d="M14 10h7"></path>
                    <path d="M21 10v7"></path>
                  </svg>
                  Randomize All
                </Button>
              </div>

              <div className="text-base md:text-lg leading-relaxed space-y-6">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="text-gray-700">Write me a</span>

                  {/* Tone Dropdown */}
                  <div className="inline-block">
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="w-36 sm:w-40 md:w-44 h-8 text-sm md:text-base border-b-2 border-blue-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="tone" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[180px]">
                        <SelectItem value="humorous">humorous</SelectItem>
                        <SelectItem value="dark">dark</SelectItem>
                        <SelectItem value="gritty">gritty</SelectItem>
                        <SelectItem value="lighthearted">
                          lighthearted
                        </SelectItem>
                        <SelectItem value="melancholic">melancholic</SelectItem>
                        <SelectItem value="romantic">romantic</SelectItem>
                        <SelectItem value="satirical">satirical</SelectItem>
                        <SelectItem value="suspenseful">suspenseful</SelectItem>
                        <SelectItem value="tragicomic">tragicomic</SelectItem>
                        <SelectItem value="uplifting">uplifting</SelectItem>
                        <SelectItem value="whimsical">whimsical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Genre Dropdown */}
                  <div className="inline-block">
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="w-36 sm:w-40 md:w-44 h-8 text-sm md:text-base border-b-2 border-green-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="genre" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[180px]">
                        <SelectItem value="mystery">mystery</SelectItem>
                        <SelectItem value="romance">romance</SelectItem>
                        <SelectItem value="sci_fi">sci-fi</SelectItem>
                        <SelectItem value="adventure">adventure</SelectItem>
                        <SelectItem value="slice_of_life">
                          slice of life
                        </SelectItem>
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
                      <SelectTrigger className="w-40 sm:w-48 md:w-52 h-8 text-sm md:text-base border-b-2 border-purple-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="theme" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[200px]">
                        <SelectItem value="forgiveness">forgiveness</SelectItem>
                        <SelectItem value="freedom_vs_control">
                          freedom vs control
                        </SelectItem>
                        <SelectItem value="growth">growth</SelectItem>
                        <SelectItem value="identity">identity</SelectItem>
                        <SelectItem value="love_vs_duty">
                          love vs duty
                        </SelectItem>
                        <SelectItem value="revenge_and_justice">
                          revenge & justice
                        </SelectItem>
                        <SelectItem value="technology_vs_humanity">
                          tech vs humanity
                        </SelectItem>
                        <SelectItem value="sacrifice">sacrifice</SelectItem>
                        <SelectItem value="trust_and_betrayal">
                          trust & betrayal
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <span className="text-gray-700">set in</span>

                  {/* Setting Dropdown */}
                  <div className="inline-block">
                    <Select value={setting} onValueChange={setSetting}>
                      <SelectTrigger className="w-40 sm:w-48 md:w-52 h-8 text-sm md:text-base border-b-2 border-amber-500 rounded-none bg-transparent focus:ring-0">
                        <SelectValue placeholder="setting" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[200px]">
                        <SelectItem value="cyberpunk_world">
                          cyberpunk world
                        </SelectItem>
                        <SelectItem value="steampunk_world">
                          steampunk world
                        </SelectItem>
                        <SelectItem value="noir_setting">
                          noir setting
                        </SelectItem>
                        <SelectItem value="modern_day">modern day</SelectItem>
                        <SelectItem value="school">school</SelectItem>
                        <SelectItem value="history">history</SelectItem>
                        <SelectItem value="mythology">mythology</SelectItem>
                        <SelectItem value="space">space</SelectItem>
                        <SelectItem value="dystopia">dystopia</SelectItem>
                        <SelectItem value="utopia">utopia</SelectItem>
                        <SelectItem value="urban_city">urban city</SelectItem>
                        <SelectItem value="haunted_place">
                          a haunted place
                        </SelectItem>
                        <SelectItem value="countryside">countryside</SelectItem>
                        <SelectItem value="post_apocalypse">
                          post-apocalypse
                        </SelectItem>
                        <SelectItem value="virtual_reality">
                          virtual reality
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-between">
              <Button variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!theme || !tone || !genre || !setting || isValidating}
              >
                {isValidating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Validating...
                  </>
                ) : (
                  "Next: Concept"
                )}
              </Button>
            </div>

            {/* Debug button - remove in production */}
            {/* <div className="text-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualReset}
                className="text-xs text-gray-500"
              >
                Reset Form (Debug)
              </Button>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
}

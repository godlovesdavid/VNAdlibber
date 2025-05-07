import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Wand2, Trash, Plus } from "lucide-react";
import { Character } from "@/types/vn";
import { useToast } from "@/hooks/use-toast";
import { useSimpleAutosave } from "@/lib/autosave";
import { apiRequest } from "@/lib/queryClient";
import { json } from "express";

export default function CharactersForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setCharactersData, goToStep } = useVnContext();
  const {
    generateCharacterData,
    generateMultipleCharactersData,
    isGenerating,
    cancelGeneration,
  } = useVnData();
  const { toast } = useToast();
  
  // Track validation state
  const [isValidating, setIsValidating] = useState(false);

  // Extended Character interface for form usage (includes name separately)
  interface CharacterForm extends Character {
    name: string; // Only used in the form, not stored in the context
  }

  // Form state
  const [characters, setCharacters] = useState<CharacterForm[]>([
    {
      name: "",
      role: "protagonist",
      occupation: "",
      gender: "",
      age: "",
      appearance: "",
      personality: "",
      goals: "",
      relationshipPotential: "",
      conflict: "",
    },
  ]);
  
  // Track which character is being generated
  const [generatingCharacterIndex, setGeneratingCharacterIndex] = useState<number | null>(null);
  
  // Autosave indicator state
  const [isAutosaving, setIsAutosaving] = useState(false);

  
  // Function to add a new character card
  const addCharacter = () => {
    if (characters.length >= 5) {
      alert("You can only create up to 5 characters.");
      return;
    }

    setCharacters([
      ...characters,
      {
        name: "",
        role: characters.length === 0 ? "protagonist" : "",
        occupation: "",
        gender: "",
        age: "",
        appearance: "",
        personality: "",
        goals: "",
        relationshipPotential: "",
        conflict: "",
      },
    ]);
  };

  // Remove a character
  const removeCharacter = (index: number) => {
    if (characters.length <= 1) {
      alert("You must have at least one character.");
      return;
    }

    const updatedCharacters = [...characters];
    updatedCharacters.splice(index, 1);
    setCharacters(updatedCharacters);
  };
  
  // Reset all characters with confirmation
  const handleResetForm = () => {
    // Ask for confirmation before clearing
    if (!window.confirm("Are you sure?")) {
      return; // User canceled the reset
    }
    
    // Create a default protagonist character
    const defaultCharacter: CharacterForm = {
      name: "",
      role: "Protagonist",
      occupation: "",
      gender: "",
      age: "",
      appearance: "",
      personality: "",
      goals: "",
      relationshipPotential: "",
      conflict: ""
    };
    
    // Reset to a single empty character form
    setCharacters([defaultCharacter]);
    
    // Save empty data to context
    setCharactersData({});
    
    // Show toast notification
    toast({
      title: "Form Reset",
      description: "Characters form has been reset.",
      variant: "default"
    });
  };

  // Update character field
  const updateCharacter = (
    index: number,
    field: string, // Using string type to allow 'name' which isn't in Character
    value: string,
  ) => {
    const updatedCharacters = [...characters];
    updatedCharacters[index] = {
      ...updatedCharacters[index],
      [field]: value,
    };
    setCharacters(updatedCharacters);
  };

  // Generate character details using AI
  const handleGenerateCharacter = async (index: number) => {
    setGeneratingCharacterIndex(index);

    try {
      const generatedCharacter = await generateCharacterData(
        index,
        characters[index],
      );

      if (generatedCharacter) {
        const updatedCharacters = [...characters];
        updatedCharacters[index] = {
          ...updatedCharacters[index],
          ...generatedCharacter,
        };
        setCharacters(updatedCharacters);
      }
    } catch (error) {
      console.error("Error generating character:", error);
    } finally {
      setGeneratingCharacterIndex(null);
    }
  };

  // Generate all characters
  const handleGenerateAllCharacters = async () => {
    // Only generate for existing characters
    if (characters.length === 0) 
      return;
    
    // Make a copy of the current characters array
    const allCharacters = [...characters];

    // Set state for UI feedback
    setGeneratingCharacterIndex(-1); // -1 indicates "all"

    try {
      // Generate all characters in one API call
      const generatedCharacters =
        await generateMultipleCharactersData(allCharacters);
      if (generatedCharacters && Array.isArray(generatedCharacters)) {
        // Merge the generated characters with existing character data
        const updatedCharacters = allCharacters.map((char, idx) => {
          return {
            ...char,
            ...generatedCharacters[idx],
          };
        });

        // Update state
        setCharacters(updatedCharacters);
      }
    } catch (error) {
      console.error("Error generating characters:", error);
    } finally {
      setGeneratingCharacterIndex(null);
    }
  };

  // Helper function to save character data
  const saveCharacterData = () => {
    // Transform array to object format
    const charactersObj: Record<string, Character> = {};

    characters.forEach((char) => {
      if (char.name) {
        const { name, ...characterWithoutName } = char;
        charactersObj[name] = characterWithoutName as Character;
      }
    });

    // Set the characters data
    setCharactersData(charactersObj);
    
    return { charactersObj };
  };

  // Go back to previous step
  const handleBack = () => {
    saveCharacterData()
    // Navigate to previous step
    goToStep(2);
  };

  // Proceed to next step
  const handleNext = async () => {
    // Local validation for at least one character with a name
    const incompleteCharacters = characters.filter(char => !char.name || !char.name.trim());
    
    if (incompleteCharacters.length > 0) {
      toast({
        title: "Missing Character Names",
        description: "Please provide a name for each character before proceeding.",
        variant: "destructive"
      });
      return;
    }
    
    // Save data using our helper function
    const { charactersObj } = saveCharacterData();
    
    if (!projectData) {
      toast({
        title: "Error",
        description: "Project data is missing",
        variant: "destructive"
      });
      return;
    }
    
    // Additional server-side validation
    setIsValidating(true);
    
    try {
      // Create validation context
      const contextData = {
        basicData: projectData.basicData,
        conceptData: projectData.conceptData,
        charactersData: charactersObj,
      };
      
      try {
        // Call validate endpoint directly to handle error messages properly
        const validationResponse = await apiRequest("POST", "/api/validate", {
          projectContext: contextData,
          contentType: "characters",
        });
        
        const validationResult = await validationResponse.json();
        
        if (validationResult.valid) {
          toast({
            title: "Validation Passed",
            description: validationResult.message || "Characters validated successfully."
          });
          
          // Navigate to the next step
          setLocation("/create/paths");
        } else {
          // Show the specific validation error from the server
          toast({
            title: "Character Validation Failed",
            description: validationResult.issues || validationResult.message || "Your characters don't align with the story.",
            variant: "destructive",
            // Set longer duration for validation errors
            duration: 120000,
          });
        }
      } catch (error: any) {
        console.error("Validation error:", error);
        
        // Extract the specific message from the error object
        const errorMessage = error.data?.message || 
                            "Please check your character data and try again.";
        
        toast({
          title: "Character Validation Error",
          description: errorMessage,
          variant: "destructive",
          duration: 120000,
        });
      }
    } catch (error) {
      console.error("Error in character validation flow:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };
  
  // Setup autosave
  useSimpleAutosave(
    characters, 
    (data) => {
      // Skip saving if no characters
      if (!data || data.length === 0) return;
      
      // Show autosaving indicator
      setIsAutosaving(true);
      
      // Transform to object format for storage
      const charactersObj: Record<string, Character> = {};
      
      data.forEach((char, idx) => {
        if (char.name) {
          // Extract name but don't store it in the object
          const { name, ...characterWithoutName } = char;
          
          // Remove any numeric keys that might be causing unintended nesting
          const cleanCharacter = Object.entries(characterWithoutName)
            .filter(([key]) => isNaN(Number(key)))
            .reduce((obj, [key, value]) => {
              obj[key] = value;
              return obj;
            }, {} as Record<string, any>) as Character;
            
          charactersObj[name] = cleanCharacter;
        }
      });
      
      // Save to context
      setCharactersData(charactersObj);
      
      // Clear autosaving indicator after a short delay
      setTimeout(() => setIsAutosaving(false), 300);
    },
    500, 
    "CharactersForm" // Log prefix
  );
  
  // Load existing data if available
  useEffect(() => {
    if (projectData?.charactersData && Object.keys(projectData.charactersData).length > 0) {
      // Convert from object to array format for the form
      const charactersArray = Object.entries(projectData.charactersData).map(
        ([name, character]) => {
          return {
            ...character,
            name // Add name field for form usage
          };
        }
      );
      
      setCharacters(charactersArray);
    }
  }, [projectData]);

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={3} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Step 3: Characters
            </h2>
            <p className="text-gray-600">
              Create the characters who will bring your story to life. The first character
              will be the protagonist.
            </p>
          </div>

          {characters.map((character, index) => (
            <Card key={index} className="mb-8">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {index === 0 ? "Protagonist" : `Character ${index + 1}`}
                  </CardTitle>
                  {index > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => removeCharacter(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label
                    htmlFor={`name-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name
                  </label>
                  <Input
                    id={`name-${index}`}
                    value={character.name}
                    onChange={(e) =>
                      updateCharacter(index, "name", e.target.value)
                    }
                    placeholder="Character name"
                  />
                </div>
                
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  {index === 0 ? (
                    <Input
                      placeholder="Protagonist"
                      value="Protagonist"
                      disabled
                      className="bg-gray-100 text-gray-500"
                    />
                  ) : (
                    <Input
                      value={character.role}
                      placeholder="e.g. antagonist, rival, mentor, sidekick, childhood friend, mother, hidden ally"
                      onChange={(e) =>
                        updateCharacter(index, "role", e.target.value)
                      }
                    />
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`occupation-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Occupation
                  </label>
                  <Input
                    id={`occupation-${index}`}
                    value={character.occupation}
                    onChange={(e) =>
                      updateCharacter(index, "occupation", e.target.value)
                    }
                    placeholder="Character occupation"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`gender-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Gender
                  </label>
                  <Input
                    id={`gender-${index}`}
                    value={character.gender}
                    onChange={(e) =>
                      updateCharacter(index, "gender", e.target.value)
                    }
                    placeholder="Character gender"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`age-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Age
                  </label>
                  <Input
                    id={`age-${index}`}
                    value={character.age}
                    onChange={(e) =>
                      updateCharacter(index, "age", e.target.value)
                    }
                    placeholder="Character age"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`appearance-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Appearance
                  </label>
                  <Textarea
                    id={`appearance-${index}`}
                    value={character.appearance}
                    onChange={(e) =>
                      updateCharacter(index, "appearance", e.target.value)
                    }
                    rows={2}
                    placeholder="Describe the character's physical appearance"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`personality-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Personality
                  </label>
                  <Textarea
                    id={`personality-${index}`}
                    value={character.personality}
                    onChange={(e) =>
                      updateCharacter(index, "personality", e.target.value)
                    }
                    rows={2}
                    placeholder="Describe the character's personality traits, quirks, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`goals-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Goals & Motivations
                  </label>
                  <Textarea
                    id={`goals-${index}`}
                    value={character.goals}
                    onChange={(e) =>
                      updateCharacter(index, "goals", e.target.value)
                    }
                    rows={2}
                    placeholder="What does the character want? What drives them?"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`relationshipPotential-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Relationship Potential
                  </label>
                  <Textarea
                    id={`relationshipPotential-${index}`}
                    value={character.relationshipPotential}
                    onChange={(e) =>
                      updateCharacter(
                        index,
                        "relationshipPotential",
                        e.target.value,
                      )
                    }
                    rows={2}
                    placeholder="How might this character interact with or relate to others?"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor={`conflict-${index}`}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Internal/External Conflicts
                  </label>
                  <Textarea
                    id={`conflict-${index}`}
                    value={character.conflict}
                    onChange={(e) =>
                      updateCharacter(index, "conflict", e.target.value)
                    }
                    rows={2}
                    placeholder="What struggles does this character face?"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleGenerateCharacter(index)}
                  variant="outline"
                  className="flex items-center text-primary border-primary hover:bg-primary/10"
                  disabled={isGenerating}
                >
                  {generatingCharacterIndex === index && isGenerating ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary"
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
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1 h-4 w-4" /> Generate Character
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}

          <div className="pt-6 flex flex-col space-y-4">
            <div className="flex justify-center gap-4">
              <Button
                onClick={addCharacter}
                variant="secondary"
                className="flex items-center"
                disabled={characters.length >= 5}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Character
              </Button>

              <Button
                onClick={handleGenerateAllCharacters}
                variant="secondary"
                className="flex items-center text-primary border-primary hover:bg-primary/10"
                disabled={isGenerating || characters.length === 0}
              >
                <Wand2 className="mr-1 h-4 w-4" />
                {generatingCharacterIndex === -1 && isGenerating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                    Generating...
                  </>
                ) : (
                  <>Generate All Characters</>
                )}
              </Button>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  title={projectData?.conceptData ? `Back to: ${projectData.conceptData.title || 'Concept'}` : 'Back'}
                >
                  Back
                </Button>
                {/* Autosave indicator */}
                {isAutosaving && (
                  <div className="ml-3 flex items-center text-xs text-gray-500">
                    <svg
                      className="animate-spin mr-1 h-3 w-3 text-gray-500"
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
                    Autosaving...
                  </div>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleResetForm}
                  disabled={isGenerating}
                >
                  Reset
                </Button>
                <Button onClick={handleNext} disabled={isValidating || isGenerating}>
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
                    "Next: Paths"
                  )}
                </Button>
              </div>
            </div>

            {isGenerating && generatingCharacterIndex !== null && (
              <div className="pt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={cancelGeneration}
                >
                  Cancel Generation
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
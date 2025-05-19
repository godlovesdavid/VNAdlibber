import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MinimalInput } from "@/components/ui/minimal-input";
import { MinimalTextarea } from "@/components/ui/minimal-textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Wand2, Trash, Plus, ImageIcon } from "lucide-react";
import { Character } from "@/types/vn";
import { useToast } from "@/hooks/use-toast";
import { useSimpleAutosave } from "@/lib/autosave";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

export default function CharactersForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setCharactersData, goToStep, saveProject, hasUnsavedChanges, setConfirmDialogOpen } = useVnContext();
  const {
    generateCharacterData,
    generateMultipleCharactersData,
    isGenerating,
    cancelGeneration,
  } = useVnData();
  const { toast } = useToast();
  const { t } = useTranslation();
  
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
  
  // Track portrait generation for each character
  const [generatingPortraitIndex, setGeneratingPortraitIndex] = useState<number | null>(null);
  
  // Store character portraits
  const [characterPortraits, setCharacterPortraits] = useState<Record<number, string>>({});
  
  // Autosave indicator state
  const [isAutosaving, setIsAutosaving] = useState(false);

  
  // Function to add a new character card
  const addCharacter = () => {
    if (characters.length >= 5) {
      alert(t('characterForm.maxCharactersReached', 'You can only create up to 5 characters.'));
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
      alert(t('characterForm.minCharactersRequired', 'You must have at least one character.'));
      return;
    }

    const updatedCharacters = [...characters];
    updatedCharacters.splice(index, 1);
    setCharacters(updatedCharacters);
  };
  
  // Reset all characters with confirmation
  const handleResetForm = () => {
    // Ask for confirmation before clearing
    if (!window.confirm(t('common.confirm', 'Are you sure?'))) {
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
    
    // Show toast notification
    toast({
      title: t('characterForm.formReset', 'Form Reset'),
      description: t('characterForm.formResetDesc', 'Characters form has been reset.'),
      variant: "default"
    });
  };

  // Helper function to save character data
  const saveCharacterData = (justReturnObj: boolean = false) => {
    // Transform array to object format
    const charactersObj: Record<string, Character> = {};

    characters.forEach((char) => {
      if (!char.name) return; // Skip characters without a name
      
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
    });

    // Set the characters data
    if (!justReturnObj) {
      setCharactersData(charactersObj);
    }
    
    // Log for debugging
    console.log('Saving characters data to context in helper:', charactersObj);
    
    return charactersObj;
  };

  //save and return buttons
  useEffect(() => {
    const returnButtonHandler = () => {
      if (projectData && hasUnsavedChanges({...projectData, charactersData: saveCharacterData(true), currentStep: 3})) {
        setConfirmDialogOpen(true);
      } else {
        setLocation("/");
      }
    };
    
    const saveFormHandler = () => {
      if (projectData) {
        saveProject({...projectData, charactersData: saveCharacterData(true), currentStep: 3});
      }
    };
    
    document.addEventListener("return", returnButtonHandler);
    document.addEventListener("save", saveFormHandler);

    return () => {
      document.removeEventListener("return", returnButtonHandler);
      document.removeEventListener("save", saveFormHandler);
    };
  }, [characters, projectData, saveProject, hasUnsavedChanges, setConfirmDialogOpen, setLocation]);
  
  // Update character field with name uniqueness check
  const updateCharacter = (
    index: number,
    field: string, // Using string type to allow 'name' which isn't in Character
    value: string,
  ) => {
    // Special handling for name field to ensure uniqueness
    if (field === 'name' && value) {
      // Check if this name already exists in another character
      const nameExists = characters.some(
        (character, idx) => idx !== index && character.name === value
      );
      
      if (nameExists) {
        toast({
          title: t('characterForm.duplicateName', 'Duplicate Name'),
          description: t('characterForm.duplicateNameDesc', 'Each character must have a unique name. Please choose a different name.'),
          variant: "destructive"
        });
        return; // Don't update if duplicate
      }
    }
    
    const updatedCharacters = [...characters];
    updatedCharacters[index] = {
      ...updatedCharacters[index],
      [field]: value,
    };
    setCharacters(updatedCharacters);
  };

  // Generate character details using AI
  const handleGenerateCharacter = async (index: number, e?: React.MouseEvent) => {
    // Prevent default form submission if this was triggered by a form
    if (e) {
      e.preventDefault();
    }
    
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
  
  // Generate character portrait using AI
  const handleGeneratePortrait = async (index: number) => {
    // Need at least basic character details to generate a portrait
    const character = characters[index];
    if (!character.name || !character.appearance) {
      toast({
        title: t('common.error'),
        description: t('characterForm.missingDetailsPortrait', 'Please provide at least a name and appearance description before generating a portrait.'),
        variant: "destructive"
      });
      return;
    }
    
    setGeneratingPortraitIndex(index);
    
    try {
      // Construct a portrait prompt based on character details
      const prompt = `Generate a 2:3 portrait of ${character.name}, a ${character.age ? character.age + '-year-old ' : ''}${character.gender} ${character.occupation}. ${character.appearance}`;
      
      // Call the server API to generate a portrait
      const response = await apiRequest("POST", "/api/generate/portrait", { prompt });
      const portraitData = await response.json();
      
      if (portraitData && portraitData.imageUrl) {
        setCharacterPortraits(prev => ({
          ...prev,
          [index]: portraitData.imageUrl
        }));
        
        toast({
          title: t('characterForm.portraitGenerated', 'Portrait Generated'),
          description: t('characterForm.portraitGeneratedDesc', 'Character portrait has been generated successfully.')
        });
      } else {
        throw new Error("Failed to generate portrait");
      }
    } catch (error) {
      console.error("Error generating portrait:", error);
      toast({
        title: t('errorMessages.generationFailed'),
        description: t('characterForm.portraitGenerationError', 'Failed to generate character portrait. Please check your API configuration.'),
        variant: "destructive"
      });
    } finally {
      setGeneratingPortraitIndex(null);
    }
  };

  // Generate all characters and their portraits
  const handleGenerateAllCharacters = async (e?: React.MouseEvent) => {
    // Prevent default form submission if this was triggered by a form
    if (e) {
      e.preventDefault();
    }
    
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
        
        // After generating character data, generate portraits for each character
        toast({
          title: "Generating Portraits",
          description: "Now generating portraits for all characters...",
        });
        
        // Generate portraits for each character sequentially
        for (let i = 0; i < updatedCharacters.length; i++) {
          const character = updatedCharacters[i];
          if (character.name && character.appearance) {
            try {
              setGeneratingPortraitIndex(i);
              
              // Construct portrait prompt
              const prompt = `Generate a 2:3 portrait of ${character.name}, a ${character.age ? character.age + '-year-old ' : ''}${character.gender} ${character.occupation}. ${character.appearance}`;
              
              // Call the server API to generate a portrait
              const response = await apiRequest("POST", "/api/generate/portrait", { prompt });
              const portraitData = await response.json();
              
              if (portraitData && portraitData.imageUrl) {
                setCharacterPortraits(prev => ({
                  ...prev,
                  [i]: portraitData.imageUrl
                }));
              }
            } catch (error) {
              console.error(`Error generating portrait for character ${i}:`, error);
            }
          }
        }
        
        setGeneratingPortraitIndex(null);
        
        toast({
          title: "Generation Complete",
          description: "All characters and portraits have been generated.",
        });
      }
    } catch (error) {
      console.error("Error generating characters:", error);
    } finally {
      setGeneratingCharacterIndex(null);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    saveCharacterData();
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
    const charactersObj = saveCharacterData();
    
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
                <div className="flex items-center">
                  <CardTitle>
                    {index === 0 ? "Protagonist" : `Character ${index + 1}`}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-3 flex items-center text-primary border-primary hover:bg-primary/10"
                    onClick={() => handleGenerateCharacter(index)}
                    disabled={generatingCharacterIndex !== null}
                  >
                    {generatingCharacterIndex === index && isGenerating ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-1 h-4 w-4"
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
                        <Wand2 className="mr-1 h-4 w-4" /> Generate
                      </>
                    )}
                  </Button>
                  <div className="ml-auto">
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
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Left column - Short fields */}
                <div className="space-y-4">
                  <div className="mb-2">
                    <MinimalInput
                      id={`name-${index}`}
                      label="Name"
                      value={character.name}
                      onChange={(e) =>
                        updateCharacter(index, "name", e.target.value)
                      }
                      placeholder="Enter character name"
                    />
                  </div>
                  
                  <div className="mb-2">
                    {index === 0 ? (
                      <MinimalInput
                        label="Role"
                        placeholder="Protagonist"
                        value="Protagonist"
                        disabled
                        className="bg-gray-50 text-gray-500"
                      />
                    ) : (
                      <MinimalInput
                        label="Role"
                        value={character.role}
                        placeholder="e.g. antagonist, rival, mentor"
                        onChange={(e) =>
                          updateCharacter(index, "role", e.target.value)
                        }
                      />
                    )}
                  </div>

                  <div className="mb-2">
                    <MinimalInput
                      label="Occupation"
                      value={character.occupation}
                      onChange={(e) =>
                        updateCharacter(index, "occupation", e.target.value)
                      }
                      placeholder="Character's job or role"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <MinimalInput
                        label="Gender"
                        value={character.gender}
                        onChange={(e) =>
                          updateCharacter(index, "gender", e.target.value)
                        }
                        placeholder="Gender"
                      />
                    </div>
                    <div>
                      <MinimalInput
                        label="Age"
                        value={character.age}
                        onChange={(e) =>
                          updateCharacter(index, "age", e.target.value)
                        }
                        placeholder="Age"
                      />
                    </div>
                  </div>

                  <div>
                    <MinimalTextarea
                      label="Appearance"
                      value={character.appearance}
                      onChange={(e) =>
                        updateCharacter(index, "appearance", e.target.value)
                      }
                      rows={4}
                      placeholder="Physical description - important for character visualization"
                    />
                  </div>
                </div>
                
                {/* Right column - Character portrait */}
                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-md">
                  <div className="relative w-full" style={{ aspectRatio: '1/1.1' }}>
                    {characterPortraits[index] ? (
                      <img 
                        src={characterPortraits[index]} 
                        alt={`Portrait of ${character.name || 'character'}`}
                        className="w-full h-full object-cover rounded-md shadow-md"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-md">
                        <ImageIcon className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {generatingPortraitIndex === index && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                        <svg
                          className="animate-spin h-10 w-10 text-white"
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
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleGeneratePortrait(index)}
                    variant="outline"
                    className="w-full"
                    disabled={generatingPortraitIndex !== null}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Generate Portrait
                  </Button>
                </div>

                {/* Full width fields */}
                <div className="md:col-span-2 mb-3">
                  <MinimalTextarea
                    label="Personality"
                    value={character.personality}
                    onChange={(e) =>
                      updateCharacter(index, "personality", e.target.value)
                    }
                    rows={2}
                    placeholder="Personality traits, strengths, weaknesses, quirks"
                  />
                </div>

                <div className="md:col-span-2 mb-3">
                  <MinimalTextarea
                    label="Goals and Motivation"
                    value={character.goals}
                    onChange={(e) =>
                      updateCharacter(index, "goals", e.target.value)
                    }
                    rows={2}
                    placeholder="What drives this character? What do they want?"
                  />
                </div>

                <div className="md:col-span-2 mb-3">
                  {index === 0 ? (<MinimalTextarea
                                   label="Relationship Potential"
                                   value="N/A"
                                   rows={2}
                                    disabled
                                 />) : (
                    <MinimalTextarea
                      label="Relationship Potential"
                      value={character.relationshipPotential}
                      onChange={(e) =>
                        updateCharacter(
                          index,
                          "relationshipPotential",
                          e.target.value
                        )
                      }
                      rows={2}
                      placeholder="Friend or foe? Romanceable?"
                    />)}
                </div>

                <div className="md:col-span-2 mb-3">
                  <MinimalTextarea
                    label="Conflicts"
                    value={character.conflict}
                    onChange={(e) =>
                      updateCharacter(index, "conflict", e.target.value)
                    }
                    rows={2}
                    placeholder="Internal struggles and external conflicts"
                  />
                </div>
              </CardContent>
              {/* Card footer removed since Generate button was moved to header */}
            </Card>
          ))}

          <div className="flex flex-col">
            <div className="flex justify-between gap-4">
              {/* Add Character button */}
              <div className="flex justify-center flex-grow">
                <Button
                  onClick={addCharacter}
                  variant="secondary"
                  className="flex items-center"
                  disabled={characters.length >= 5}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Character
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isGenerating || isValidating}
              >
                Back
              </Button>
              
              <div className="flex items-center">
                {isAutosaving && (
                  <div className="flex items-center text-sm text-gray-500 mr-3">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
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
              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleGenerateAllCharacters}
                  variant="outline"
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
                      Generating All...
                    </>
                  ) : (
                    "Generate All"
                  )} 
                  </Button>
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
                    "Next"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
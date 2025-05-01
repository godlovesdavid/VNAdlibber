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

export default function CharactersForm() {
  const [, setLocation] = useLocation();
  const { projectData, setCharactersData, goToStep } = useVnContext();
  const {
    generateCharacterData,
    generateMultipleCharactersData,
    isGenerating,
    cancelGeneration,
  } = useVnData();

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

  const [generatingCharacterIndex, setGeneratingCharacterIndex] = useState<
    number | null
  >(null);

  // Load existing data if available
  useEffect(() => {
    if (projectData?.charactersData && Object.keys(projectData.charactersData).length > 0) {
      // Convert from object to array format for the form
      const charactersArray = Object.entries(projectData.charactersData).map(
        ([name, character]) => ({
          ...character,
          name // Add name field for form usage
        })
      );
      
      // If there's a protagonist field set, ensure it appears first in the array
      if (projectData.protagonist && projectData.charactersData[projectData.protagonist]) {
        const protagonistIndex = charactersArray.findIndex(char => char.name === projectData.protagonist);
        if (protagonistIndex > 0) { // If not already first
          const protagonist = charactersArray[protagonistIndex];
          charactersArray.splice(protagonistIndex, 1); // Remove from current position
          charactersArray.unshift(protagonist); // Add to beginning
        }
      }
      
      setCharacters(charactersArray);
    }
  }, [projectData]);

  // Add a new character card
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
      console.log("Calling generateCharacterData for single character...");
      const generatedCharacter = await generateCharacterData(
        index,
        characters[index],
      );
      console.log("generateCharacterData returned:", generatedCharacter);

      if (generatedCharacter) {
        const updatedCharacters = [...characters];
        updatedCharacters[index] = {
          ...updatedCharacters[index],
          ...generatedCharacter,
        };
        setCharacters(updatedCharacters);

        // Update the project context after character generation
        const charactersObj: Record<string, Character> = {};
        updatedCharacters.forEach(char => {
          if (char.name) {
            charactersObj[char.name] = { ...char };
          }
        });
        
        setCharactersData(charactersObj);

        // Log generation to console
        console.log(`Generated character ${index + 1}:`, generatedCharacter);
        console.log(`Updated project context with character ${index + 1} data`);
      } else {
        console.log(`Failed to generate character ${index + 1}`);
      }
    } catch (error) {
      console.error("Error in handleGenerateCharacter:", error);
    } finally {
      setGeneratingCharacterIndex(null);
    }
  };

  // Generate all characters
  const handleGenerateAllCharacters = async () => {
    console.log("Generate All Characters button clicked");

    // Only generate for existing characters
    if (characters.length === 0) {
      console.log("No characters to generate");
      return;
    }

    // Make a copy of the current characters array
    const allCharacters = [...characters];

    // Set state for UI feedback
    setGeneratingCharacterIndex(-1); // -1 indicates "all"
    console.log("Setting generating character index to -1");

    try {
      // Skip completed protagonist in batch generation
      const characterTemplates = allCharacters.map((char, idx) => {
        if (idx === 0 && char.personality && char.goals && char.appearance) {
          console.log("Keeping existing protagonist data");
          return {
            name: char.name,
            role: char.role,
            occupation: char.occupation,
            gender: char.gender,
            age: char.age,
            appearance: char.appearance,
            personality: char.personality,
            goals: char.goals,
            relationshipPotential: char.relationshipPotential,
            conflict: char.conflict,
          };
        }
        return {
          name: char.name,
          role: char.role,
          occupation: char.occupation,
          gender: char.gender,
          age: char.age,
        };
      });

      console.log(
        `Generating ${characterTemplates.length} characters at once...`,
      );

      // Generate all characters in one API call
      const generatedCharacters =
        await generateMultipleCharactersData(characterTemplates);

      if (generatedCharacters && Array.isArray(generatedCharacters)) {
        // Merge the generated characters with existing character data
        const updatedCharacters = allCharacters.map((char, idx) => {
          // Otherwise use the generated data
          return {
            ...char,
            ...generatedCharacters[idx],
          };
        });

        // Update state and project context
        setCharacters(updatedCharacters);
        
        // Convert to object format for storage
        const charactersObj: Record<string, Character> = {};
        updatedCharacters.forEach(char => {
          if (char.name) {
            charactersObj[char.name] = { ...char };
          }
        });
        
        setCharactersData(charactersObj);

        console.log("Successfully generated all characters at once");
        console.log("Updated project context with all character data");
      } else {
        console.error("Failed to generate characters bundle");
      }
    } catch (error) {
      console.error("Error in handleGenerateAllCharacters:", error);
    } finally {
      console.log("Finished generation, resetting index");
      setGeneratingCharacterIndex(null);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    goToStep(2);
  };

  // Proceed to next step
  const handleNext = () => {
    // Validate characters
    const isValid = characters.every(
      (char) =>
        char.name &&
        char.role &&
        char.occupation &&
        char.gender &&
        char.age &&
        char.appearance &&
        char.personality &&
        char.goals &&
        char.relationshipPotential &&
        char.conflict,
    );

    // if (!isValid) {
    //   alert("Please fill in all required fields for each character");
    //   return;
    // }

    // Save data - transform array to object format
    const charactersObj: Record<string, Character> = {};
    characters.forEach(char => {
      if (char.name) {
        charactersObj[char.name] = { ...char };
      }
    });
    
    setCharactersData(charactersObj);

    // Navigate to next step
    setLocation("/create/paths");
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={3} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Step 3: Characters
            </h2>
            <p className="text-gray-600">
              Create the characters who will bring your story to life. You can
              add up to 5 characters.
            </p>
          </div>

          <div className="space-y-6">
            {characters.map((character, index) => (
              <Card
                key={index}
                className="shadow-sm hover:border-primary transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      Character {index + 1}
                      {index === 0 && (
                        <span className="text-primary ml-1">(Protagonist)</span>
                      )}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-600"
                      title="Remove Character"
                      onClick={() => removeCharacter(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <Input
                          placeholder="Character's name"
                          value={character.name}
                          onChange={(e) =>
                            updateCharacter(index, "name", e.target.value)
                          }
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

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender
                        </label>
                        <Input
                          placeholder="e.g. Male, Female, Non-binary, Robot/AI"
                          value={character.gender}
                          onChange={(e) =>
                            updateCharacter(index, "gender", e.target.value)
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Age
                        </label>
                        <Input
                          placeholder="Character's age"
                          value={character.age}
                          onChange={(e) =>
                            updateCharacter(index, "age", e.target.value)
                          }
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Occupation
                        </label>
                        <Input
                          placeholder="e.g. student, doctor, teacher, police officer"
                          value={character.occupation}
                          onChange={(e) =>
                            updateCharacter(index, "occupation", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* Character Details */}
                    <div className="space-y-3">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Appearance
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Brief physical description"
                          value={character.appearance}
                          onChange={(e) =>
                            updateCharacter(index, "appearance", e.target.value)
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Personality
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Key traits and behaviors"
                          value={character.personality}
                          onChange={(e) =>
                            updateCharacter(
                              index,
                              "personality",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Goals
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Primary motivations and objectives"
                          value={character.goals}
                          onChange={(e) =>
                            updateCharacter(index, "goals", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 space-y-3">
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Relationship Potential
                      </label>
                      {index === 0 ? (
                        <Textarea
                          rows={2}
                          placeholder="N/A - This is the protagonist"
                          value="This is the protagonist character"
                          disabled
                          className="bg-gray-100 text-gray-500"
                        />
                      ) : (
                        <Textarea
                          rows={2}
                          placeholder="How they might connect with the protagonist"
                          value={character.relationshipPotential}
                          onChange={(e) =>
                            updateCharacter(
                              index,
                              "relationshipPotential",
                              e.target.value,
                            )
                          }
                        />
                      )}
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Conflict
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="Their primary internal or external struggle"
                        value={character.conflict}
                        onChange={(e) =>
                          updateCharacter(index, "conflict", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end">
                  <Button
                    variant="ghost"
                    className="text-primary hover:text-primary/80 text-sm"
                    onClick={() => handleGenerateCharacter(index)}
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
                        <Wand2 className="mr-1 h-4 w-4" /> Generate Details
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
                      Generating All...
                    </>
                  ) : (
                    <>Generate All Characters</>
                  )}
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext}>Next: Paths</Button>
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

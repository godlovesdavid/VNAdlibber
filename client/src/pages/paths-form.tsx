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
import { Wand2, Trash, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { PathData } from "@/types/vn";
import { useToast } from "@/hooks/use-toast";
import { validateFormContent } from "@/lib/validation";
import { useSimpleAutosave } from "@/lib/autosave";

export default function PathsForm() {
  const [location, setLocation] = useLocation();
  const { projectData, setPathsData, goToStep } = useVnContext();
  const {
    generatePathData,
    generateMultiplePathsData,
    isGenerating,
    cancelGeneration,
  } = useVnData();
  const { toast } = useToast();

  // Extended PathData type with name field for form state
  interface PathForm extends PathData {
    name: string; // Only used in the form, not stored in the context
  }

  // State
  const [paths, setPaths] = useState<PathForm[]>([
    // Default empty path
    {
      name: "",
      description: "",
      choices: [],
      endings: [],
      keyMoments: [],
      triggers: [],
    },
  ]);
  const [generatingPathIndex, setGeneratingPathIndex] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);

  // Load data from context on mount
  useEffect(() => {
    if (projectData?.pathsData) {
      console.log("Loading paths data from project:", projectData.pathsData);

      // Load paths data from context
      const pathEntries = Object.entries(projectData.pathsData);
      const pathsList: PathForm[] = pathEntries.map(([name, path]) => ({
        name,
        ...path,
      }));

      // Ensure we always have at least one path
      if (pathsList.length === 0) {
        const defaultPath: PathForm = {
          name: "",
          description: "",
          choices: [],
          endings: [],
          keyMoments: [],
          triggers: [],
        };
        pathsList.push(defaultPath);
      }

      // This will trigger our autosave useEffect
      setPaths(pathsList);
    }
  }, [projectData]);

  // Autosave using custom hook
  useSimpleAutosave(
    paths,
    (data) => {
      // Skip saving if we don't have any valid paths
      if (data.length === 0 || !data[0].name) return;

      console.log("PathsForm: Content changed, queueing autosave in 1500ms...");
      
      // Show autosaving indicator
      setIsAutosaving(true);
      
      // Convert array to object format for storage
      const pathsObj = convertPathsForStorage(data);
      
      // Save to context
      setPathsData(pathsObj);
      console.log("PathsForm: Autosaved data to context");
      
      // Clear autosaving indicator after a short delay
      setTimeout(() => setIsAutosaving(false), 300);
    },
    1500, // 1.5 second delay
    "PathsForm" // Log prefix
  );

  // Add a new path
  const addPath = () => {
    if (paths.length >= 5) {
      toast({
        title: "Maximum Paths Reached",
        description: "You can only create up to 5 paths.",
        variant: "destructive"
      });
      return;
    }

    const newPath: PathForm = {
      name: "",
      description: "",
      choices: [],
      endings: [],
      keyMoments: [],
      triggers: [],
    };

    setPaths([...paths, newPath]);
  };

  // Remove a path
  const removePath = (index: number) => {
    // Must have at least one path
    if (paths.length <= 1) {
      toast({
        title: "Cannot Remove Path",
        description: "You must have at least one path.",
        variant: "destructive"
      });
      return;
    }

    const updatedPaths = [...paths];
    updatedPaths.splice(index, 1);
    setPaths(updatedPaths);
  };

  // Update a path field
  const updatePath = (
    index: number,
    field: keyof PathForm,
    value: string | string[]
  ) => {
    const updatedPaths = [...paths];
    
    updatedPaths[index] = {
      ...updatedPaths[index],
      [field]: value,
    };
    
    setPaths(updatedPaths);
  };

  // Add a value to an array field of a path
  const addValueToPathArray = (
    pathIndex: number,
    field: "choices" | "endings" | "keyMoments" | "triggers",
    value: string
  ) => {
    if (!value.trim()) return;

    const updatedPaths = [...paths];
    if (!Array.isArray(updatedPaths[pathIndex][field])) {
      updatedPaths[pathIndex][field] = [];
    }
    
    // Cast to make TypeScript happy (we know these are string arrays)
    const arrayField = updatedPaths[pathIndex][field] as string[];
    
    // Add the value if it doesn't already exist
    if (!arrayField.includes(value)) {
      updatedPaths[pathIndex][field] = [...arrayField, value];
      setPaths(updatedPaths);
    }
  };

  // Remove a value from an array field of a path
  const removeValueFromPathArray = (
    pathIndex: number,
    field: "choices" | "endings" | "keyMoments" | "triggers",
    valueIndex: number
  ) => {
    const updatedPaths = [...paths];
    const arrayField = updatedPaths[pathIndex][field] as string[];
    
    if (Array.isArray(arrayField) && valueIndex >= 0 && valueIndex < arrayField.length) {
      arrayField.splice(valueIndex, 1);
      setPaths(updatedPaths);
    }
  };

  // Generate a path
  const handleGeneratePath = async (index: number) => {
    setGeneratingPathIndex(index);
    
    // Get the basic data from the project context
    const genre = projectData?.basicData?.genre || "";
    const tone = projectData?.basicData?.tone || "";
    const setting = projectData?.basicData?.setting || "";
    const theme = projectData?.basicData?.theme || "";

    // Get the characters data
    const characters = projectData?.charactersData || {};
    const protagonist = Object.entries(characters).find(
      ([_, char]) => char.role === "protagonist"
    )?.[0] || "";

    // Get the existing path name
    const name = paths[index].name;

    try {
      // Generate the path
      const generatedPath = await generatePathData({
        name,
        genre,
        tone,
        setting,
        theme,
        characters,
        protagonist,
      });

      if (generatedPath) {
        // Update the path in the state array
        const updatedPaths = [...paths];
        updatedPaths[index] = {
          ...updatedPaths[index],
          name: name || generatedPath.name || "",
          description: generatedPath.description || "",
          choices: generatedPath.choices || [],
          endings: generatedPath.endings || [],
          keyMoments: generatedPath.keyMoments || [],
          triggers: generatedPath.triggers || [],
        };
        
        // Update the state
        setPaths(updatedPaths);
      }
    } catch (error) {
      console.error("Error generating path:", error);
      toast({
        title: "Generation Failed",
        description: "There was a problem generating the path. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPathIndex(null);
    }
  };

  // Generate all paths at once
  const handleGenerateAllPaths = async () => {
    // Set the index to -1 to indicate we're generating all paths
    setGeneratingPathIndex(-1);
    
    // Get the basic data from the project context
    const genre = projectData?.basicData?.genre || "";
    const tone = projectData?.basicData?.tone || "";
    const setting = projectData?.basicData?.setting || "";
    const theme = projectData?.basicData?.theme || "";

    // Get the characters data
    const characters = projectData?.charactersData || {};
    const protagonist = Object.entries(characters).find(
      ([_, char]) => char.role === "protagonist"
    )?.[0] || "";

    // Get the existing path names
    const pathInfos = paths.map((path) => ({
      name: path.name,
    }));

    try {
      // Generate all paths
      const generatedPaths = await generateMultiplePathsData({
        paths: pathInfos,
        genre,
        tone,
        setting,
        theme,
        characters,
        protagonist,
      });

      if (generatedPaths) {
        // Create an updated array with the generated paths
        const updatedPaths = paths.map((path, index) => {
          const generated = generatedPaths[index];
          
          // If generation failed or no data returned, keep the existing path
          if (!generated) return path;
          
          // Otherwise, update with the generated data
          return {
            ...path,
            name: path.name || generated.name || "",
            description: generated.description || path.description || "",
            choices: generated.choices || path.choices || [],
            endings: generated.endings || path.endings || [],
            keyMoments: generated.keyMoments || path.keyMoments || [],
            triggers: generated.triggers || path.triggers || [],
          };
        });
        
        // Update the state
        setPaths(updatedPaths);
      }
    } catch (error) {
      console.error("Error generating paths:", error);
      toast({
        title: "Generation Failed",
        description: "There was a problem generating paths. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingPathIndex(null);
    }
  };

  // Helper function to save path data
  const savePathData = () => {
    const pathsObj = convertPathsForStorage(paths);
    
    // Save the path data to the context
    setPathsData(pathsObj);
    
    console.log("Paths data after update:", pathsObj);
    
    return pathsObj;
  };

  // Convert array of path forms to storage format
  const convertPathsForStorage = (pathsForms: PathForm[]) => {
    // Object to store path data
    const pathsObj: Record<string, PathData> = {};
    
    // Convert each path with a name to an entry in the object
    pathsForms.forEach((path) => {
      // Skip paths without names
      if (!path.name || !path.name.trim()) return;
      
      // Store a sanitized version of the path, omitting the name field
      const { name, ...pathData } = path;
      
      // Store the path in the object using the name as the key
      pathsObj[name] = pathData;
    });
    
    console.log("Setting path data in context:", pathsObj);
    
    return pathsObj;
  };

  // Go back to previous step
  const handleBack = () => {
    // Navigate to previous step
    goToStep(3);
  };
  
  // Reset all paths to empty values
  const handleResetForm = () => {
    // Create a default empty path
    const defaultPath: PathForm = {
      name: "",
      description: "",
      choices: [],
      endings: [],
      keyMoments: [],
      triggers: [],
    };
    
    // Reset to a single empty path
    setPaths([defaultPath]);
    
    // Clear the data in context
    setPathsData({});
    
    // Show toast notification
    toast({
      title: "Paths Reset",
      description: "All path information has been cleared.",
      variant: "default"
    });
  };

  // Proceed to next step
  const handleNext = async () => {
    // Local validation for at least one path with a name
    const incompletePaths = paths.filter(path => !path.name || !path.name.trim());
    
    if (incompletePaths.length > 0) {
      toast({
        title: "Missing Path Names",
        description: "Please provide a name for each path before proceeding.",
        variant: "destructive"
      });
      return;
    }
    
    // Save data using our helper function
    const pathsObj = savePathData();
    
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
        charactersData: projectData.charactersData,
        pathsData: pathsObj,
      };
      
      // Use our validation utility
      const isValid = await validateFormContent(contextData, "paths");
      
      if (isValid) {
        // Navigate to next step
        setLocation("/create/plot");
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Component for rendering array fields
  const ArrayFieldEditor = ({
    pathIndex,
    field,
    label,
    placeholder,
  }: {
    pathIndex: number;
    field: "choices" | "endings" | "keyMoments" | "triggers";
    label: string;
    placeholder: string;
  }) => {
    const [newValue, setNewValue] = useState("");
    const values = paths[pathIndex][field] as string[] || [];

    const handleAdd = () => {
      if (newValue.trim()) {
        addValueToPathArray(pathIndex, field, newValue);
        setNewValue("");
      }
    };

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        
        <div className="flex space-x-2">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAdd}
            title={`Add ${label.toLowerCase()}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2 mt-2">
          {values.map((value, valueIndex) => (
            <div
              key={valueIndex}
              className="flex items-center p-2 bg-gray-50 rounded-md"
            >
              <span className="flex-1 text-sm">{value}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-500"
                onClick={() => removeValueFromPathArray(pathIndex, field, valueIndex)}
                title="Remove item"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {values.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              No {label.toLowerCase()} added yet
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={4} />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Step 4: Story Paths
            </h2>
            <p className="text-gray-600">
              Define the different paths your story can take. You can add up to 5 distinct paths.
            </p>
          </div>

          <div className="space-y-6">
            {paths.map((path, index) => (
              <Card
                key={index}
                className="shadow-sm hover:border-primary transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      Path {index + 1}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-600"
                      title="Remove Path"
                      onClick={() => removePath(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-6">
                    {/* Path Basics */}
                    <div className="space-y-3">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Path Name
                        </label>
                        <Input
                          placeholder="e.g. 'Romance Path', 'Mystery Path', 'Revenge Route'"
                          value={path.name}
                          onChange={(e) =>
                            updatePath(index, "name", e.target.value)
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Brief description of this story path and how it differs from others"
                          value={path.description}
                          onChange={(e) =>
                            updatePath(index, "description", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* Path Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ArrayFieldEditor
                        pathIndex={index}
                        field="choices"
                        label="Key Choices"
                        placeholder="Add a major choice on this path"
                      />

                      <ArrayFieldEditor
                        pathIndex={index}
                        field="endings"
                        label="Possible Endings"
                        placeholder="Add a possible ending"
                      />

                      <ArrayFieldEditor
                        pathIndex={index}
                        field="keyMoments"
                        label="Key Moments"
                        placeholder="Add an important story moment"
                      />

                      <ArrayFieldEditor
                        pathIndex={index}
                        field="triggers"
                        label="Path Triggers"
                        placeholder="Add what triggers this path"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end">
                  <Button
                    variant="ghost"
                    className="text-primary hover:text-primary/80 text-sm"
                    onClick={() => handleGeneratePath(index)}
                    disabled={isGenerating}
                  >
                    {generatingPathIndex === index && isGenerating ? (
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
                        <Wand2 className="mr-1 h-4 w-4" /> Generate Path
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}

            <div className="pt-6 flex flex-col space-y-4">
              <div className="flex justify-center gap-4">
                <Button
                  onClick={addPath}
                  variant="secondary"
                  className="flex items-center"
                  disabled={paths.length >= 5}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Path
                </Button>

                <Button
                  onClick={handleGenerateAllPaths}
                  variant="secondary"
                  className="flex items-center text-primary border-primary hover:bg-primary/10"
                  disabled={isGenerating || paths.length === 0}
                >
                  <Wand2 className="mr-1 h-4 w-4" />
                  {generatingPathIndex === -1 && isGenerating ? (
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
                      Generating All...
                    </>
                  ) : (
                    <>Generate All Paths</>
                  )}
                </Button>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center">
                  <Button variant="outline" onClick={handleBack}
                    title="Back to Characters"
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
                    disabled={isValidating || isGenerating}
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
                      "Next: Plot"
                    )}
                  </Button>
                </div>
              </div>

              {isGenerating && generatingPathIndex !== null && (
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
      </div>
    </>
  );
}
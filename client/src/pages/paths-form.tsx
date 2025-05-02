import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { useFormSave, useRegisterFormSave } from "@/hooks/use-form-save";
import { useAutosave } from "@/hooks/use-simple-autosave";
import { useToast } from "@/hooks/use-toast";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Wand2, Trash, Plus } from "lucide-react";
import { Route } from "@/types/vn";

// Define a form-specific interface similar to the characters form
interface RouteForm extends Route {
  title: string; // Only used in the form, not stored in the context
}

export default function PathsForm() {
  const [, setLocation] = useLocation();
  const { projectData, setPathsData, goToStep, saveProject } = useVnContext();
  const { toast } = useToast();
  const {
    generatePathData,
    generateMultiplePathsData,
    isGenerating,
    cancelGeneration,
  } = useVnData();
  
  // Form state for routes using our form-specific interface
  const [routes, setRoutes] = useState<RouteForm[]>([
    {
      title: "Main Path", // Give a default title so it always saves
      loveInterest: null,
      keyChoices: "",
      beginning: "",
      middle: "",
      climax: "",
      goodEnding: "",
      badEnding: "",
    },
  ]);

  const [generatingPathIndex, setGeneratingPathIndex] = useState<number | null>(
    null,
  );

  // Reference to track if we've loaded data and are in an editing session
  const dataLoadedRef = useRef(false);

  // Load existing data if available, but only on initial load
  useEffect(() => {
    // Skip if we've already loaded data - prevents reloading deleted paths
    if (dataLoadedRef.current) {
      console.log("Path data already loaded, skipping reload to prevent data loss");
      return;
    }
    if (projectData?.pathsData && Object.keys(projectData.pathsData).length > 0) {
      console.log("Loading paths data from context:", projectData.pathsData);
      
      try {
        // Convert from object to array format for the form
        // Since we removed the title property from stored routes, we need to add it back for UI display
        const routesArray = Object.entries(projectData.pathsData).map(
          ([title, route]) => {
            console.log(`Processing path with title: '${title}':`, route);
            
            // Check if the route data has numeric indices (which could happen from API)
            const hasNumericKeys = Object.keys(route).some(key => !isNaN(Number(key)));
            if (hasNumericKeys) {
              console.log("Found numeric keys in route data:", 
                Object.keys(route).filter(key => !isNaN(Number(key))));
              
              // Clean up the route data before using it
              const cleanRoute = Object.entries(route)
                .filter(([key]) => isNaN(Number(key)))
                .reduce((obj, [key, value]) => {
                  obj[key] = value;
                  return obj;
                }, {} as Record<string, any>) as Route;
                
              return {
                ...cleanRoute,
                title // Add the title from the key for the form
              };
            }
            
            return {
              ...route,
              title // Add the title from the key for the form
            };
          }
        );
        
        console.log("Converted routes array:", routesArray);
        
        if (routesArray.length > 0) {
          setRoutes(routesArray);
          console.log("Successfully set routes from project data");
        } else {
          console.log("No valid routes found in project data");
        }

        // Mark that we've loaded data - we won't reload after this
        dataLoadedRef.current = true;
        console.log("Path data loaded, setting dataLoadedRef to true");
      } catch (error) {
        console.error("Error processing paths data:", error);
        // Set a default empty path if we can't load the saved ones
        setRoutes([{
          title: "Main Path", // Give a default title so it always saves
          loveInterest: null,
          keyChoices: "",
          beginning: "",
          middle: "",
          climax: "",
          goodEnding: "",
          badEnding: "",
        }]);
        
        // Even with an error, we've attempted to load, so mark as loaded
        dataLoadedRef.current = true;
        console.log("Path data loaded (with default values), setting dataLoadedRef to true");
      }
    } else {
      console.log("No paths data found in project data");
    }
  }, [projectData]);
  
  // Helper function to save path data - matching the structure of saveCharacterData
  function savePathData() {
    console.log("Saving path data...");
    
    // Convert array to object format for storage
    const pathsObj: Record<string, Route> = {};
    
    // Check if there's any data to save
    if (routes.length === 0) {
      console.log("No paths to save");
      return pathsObj;
    }
    
    // Log the routes array before processing
    console.log("Paths to save:", routes);
    
    routes.forEach(route => {
      // Only process routes that have a title
      if (route.title) {
        console.log(`Processing path with title: ${route.title}`);
        
        // Extract title but don't store it in the object
        const { title, ...routeWithoutTitle } = route;
        
        // Remove any numeric keys that might be causing unintended nesting
        const cleanRoute = Object.entries(routeWithoutTitle)
          .filter(([key]) => isNaN(Number(key)))
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {} as Record<string, any>) as Route;
        
        // Store with title as key and the rest of the properties as value
        pathsObj[title] = cleanRoute;
      } else {
        console.log("Skipping path with no title");
      }
    });
    
    console.log("Final paths object to save:", pathsObj);
    
    // Set the paths data in the context
    setPathsData(pathsObj);
    
    return pathsObj;
  }
  
  // Register with form save system
  useRegisterFormSave('paths', savePathData);
  
  // Path form autosave component
  const PathFormAutosave = () => {
    const handleAutosave = (data: Record<string, any>) => {
      console.log("Path autosave triggered with routes:", routes);
      
      // Save path data to context
      const result = savePathData();
      
      // Save to server if we have a project ID
      if (projectData?.id) {
        console.log("Saving paths to server...");
        saveProject().then(() => {
          console.log("Saved paths to server successfully");
          toast({
            title: "Saved",
            description: `Saved ${Object.keys(result).length} paths automatically`,
            duration: 2000,
          });
        }).catch(err => {
          console.error("Error saving paths to server:", err);
        });
      }
    };
    
    // Set up autosave to run every 10 seconds
    useAutosave('paths', handleAutosave, 10000);
    
    return null; // This component doesn't render anything
  };
  
  // Track if initial data has been loaded, to prevent infinite cycles
  const initialDataLoadedRef = useRef(false);

  // Add a new path card
  const addPath = () => {
    if (routes.length >= 3) {
      alert("You can only create up to 3 paths.");
      return;
    }
    
    // Create a default path title based on path number
    const pathNumber = routes.length + 1;
    const defaultTitle = `Path ${pathNumber}`;

    setRoutes([
      ...routes,
      {
        title: defaultTitle,
        loveInterest: null,
        keyChoices: "",
        beginning: "",
        middle: "",
        climax: "",
        goodEnding: "",
        badEnding: "",
      },
    ]);
  };

  // Remove a path
  const removePath = (index: number) => {
    if (routes.length <= 1) {
      alert("You must have at least one path.");
      return;
    }

    console.log(`Removing path at index ${index}`);
    const pathToRemove = routes[index];
    console.log("Path being removed:", pathToRemove);
    
    const updatedRoutes = [...routes];
    updatedRoutes.splice(index, 1);
    setRoutes(updatedRoutes);
    
    // Immediately save after removing a path to ensure it's removed from storage
    console.log("Immediately saving after path removal");
    const savedPaths = savePathData();
    console.log("Updated paths after removal:", savedPaths);
    
    // Also save to server if we have a project ID to ensure the removal is persisted
    if (projectData?.id) {
      console.log("Saving to server after path removal");
      saveProject().then(() => {
        console.log("Saved to server after path removal");
        toast({
          title: "Path Removed",
          description: `${pathToRemove.title || 'Path'} has been removed`,
          duration: 2000,
        });
      }).catch(err => {
        console.error("Error saving after path removal:", err);
      });
    }
  };

  // Update path field
  const updatePath = (index: number, field: keyof RouteForm, value: any) => {
    const updatedRoutes = [...routes];
    updatedRoutes[index] = {
      ...updatedRoutes[index],
      [field]: value,
    };
    setRoutes(updatedRoutes);
  };

  // Update key choices string
  const updateKeyChoices = (pathIndex: number, value: string) => {
    const updatedRoutes = [...routes];
    updatedRoutes[pathIndex] = {
      ...updatedRoutes[pathIndex],
      keyChoices: value,
    };
    setRoutes(updatedRoutes);
  };

  // Generate path details using AI
  const handleGeneratePath = async (index: number) => {
    console.log(`Generating path details for index ${index}...`);
    setGeneratingPathIndex(index);

    try {
      console.log("Calling generatePathData for single path...");
      console.log("Current path before generation:", routes[index]);
      
      const generatedPath = await generatePathData(index, routes[index]);
      console.log("generatePathData returned:", generatedPath);

      if (generatedPath) {
        console.log("Checking generated path structure for numeric keys...");
        const hasNumericKeysInGenerated = Object.keys(generatedPath).some(key => !isNaN(Number(key)));
        console.log(`Generated path has numeric keys: ${hasNumericKeysInGenerated}`);
        
        if (hasNumericKeysInGenerated) {
          console.log("Numeric keys found in generated path:", 
            Object.keys(generatedPath).filter(key => !isNaN(Number(key))));
        }
        
        const updatedRoutes = [...routes];
        console.log("Before merge:", updatedRoutes[index]);
        
        updatedRoutes[index] = {
          ...updatedRoutes[index],
          ...generatedPath,
        };
        
        console.log("After merge:", updatedRoutes[index]);
        setRoutes(updatedRoutes);

        // Update the project context after generation
        const savedData = savePathData();
        console.log(`Saved paths data after generation:`, savedData);
        
        // Save to server if we have a project ID
        if (projectData?.id) {
          try {
            await saveProject();
            console.log(`Saved path ${index + 1} data to server`);
          } catch (error) {
            console.error("Error saving project after path generation:", error);
          }
        }

        // Log generation to console
        console.log(`🔥 Generated path ${index + 1}:`, generatedPath);
        console.log(`🔥 Updated project context with path ${index + 1} data`);
      } else {
        console.log(`Failed to generate path ${index + 1}`);
      }
    } catch (error) {
      console.error("Error in handleGeneratePath:", error);
    } finally {
      setGeneratingPathIndex(null);
    }
  };

  // Generate all paths
  const handleGenerateAllPaths = async () => {
    console.log("Generate All Paths button clicked");

    // Only generate for existing paths
    if (routes.length === 0) {
      console.log("No routes to generate");
      return;
    }

    // Make a copy of the current routes array
    const allRoutes = [...routes];

    // Set state for UI feedback
    setGeneratingPathIndex(-1); // -1 indicates "all"
    console.log("Setting generating path index to -1");

    try {
      // Create templates with only basic info for each path
      const pathTemplates = allRoutes.map((route) => ({
        title: route.title,
        loveInterest: route.loveInterest,
      }));

      console.log(`Generating ${pathTemplates.length} paths at once with templates:`, pathTemplates);

      // Generate all paths in one API call
      const generatedPaths = await generateMultiplePathsData(pathTemplates);
      console.log("Received generated paths:", generatedPaths);
      
      if (generatedPaths && Array.isArray(generatedPaths)) {
        // Check for numeric keys in generated paths
        generatedPaths.forEach((path, idx) => {
          const hasNumericKeys = Object.keys(path).some(key => !isNaN(Number(key)));
          if (hasNumericKeys) {
            console.log(`Generated path ${idx} has numeric keys:`, 
              Object.keys(path).filter(key => !isNaN(Number(key))));
          }
        });
        
        // Merge the generated paths with existing path data
        const updatedRoutes = allRoutes.map((route, idx) => {
          console.log(`Merging path ${idx}:`);
          console.log("Original:", route);
          console.log("Generated:", generatedPaths[idx]);
          
          // Merge the data
          const merged = {
            ...route,
            ...generatedPaths[idx],
          };
          
          console.log("Result:", merged);
          return merged;
        });

        // Update state and project context
        setRoutes(updatedRoutes);
        
        // Save the path data to the context with our enhanced clean-up function
        const savedData = savePathData();
        console.log("Paths saved after batch generation:", savedData);
        
        // Save to server if we have a project ID
        if (projectData?.id) {
          try {
            await saveProject();
            console.log("Saved all paths data to server");
          } catch (error) {
            console.error("Error saving project after batch path generation:", error);
          }
        }

        console.log("Successfully generated all paths at once");
        console.log("Updated project context with all path data");
      } else {
        console.error("Failed to generate paths bundle");
      }
    } catch (error) {
      console.error("Error in handleGenerateAllPaths:", error);
    } finally {
      console.log("Finished path generation, resetting index");
      setGeneratingPathIndex(null);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    // Save data before navigating back
    savePathData();
    
    // Navigate to previous step
    goToStep(3);
  };

  // Proceed to next step
  const handleNext = () => {
    console.log("Next button clicked");
    
    // Save data using our helper function
    const savedData = savePathData();
    console.log("Paths saved on next:", savedData);
    
    // Also explicitly save the project
    if (projectData?.id) {
      saveProject()
        .then(() => console.log("Project saved to server"))
        .catch(err => console.error("Error saving project:", err));
    }

    // Navigate to next step
    setLocation("/create/plot");
  };

  // Get character options for love interest dropdown
  const getCharacterOptions = () => {
    if (!projectData?.charactersData || Object.keys(projectData.charactersData).length === 0) {
      return [];
    }

    // Convert the object of characters to an array of options
    return Object.entries(projectData.charactersData).map(([name, char]) => ({
      label: name,
      value: name,
    }));
  };

  return (
    <>
      <NavBar />
      <CreationProgress currentStep={4} />
      <PathFormAutosave />

      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Step 4: Story Paths
            </h2>
            <p className="text-gray-600">
              Define the different routes and endings your story can take. You
              can create up to 3 distinct paths.
            </p>
          </div>

          <div className="space-y-6">
            {routes.map((route, index) => (
              <Card
                key={index}
                className="shadow-sm hover:border-primary transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      Path {index + 1}
                      {index === 0 && (
                        <span className="text-primary ml-1">(Main Route)</span>
                      )}
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
                  <div className="space-y-4">
                    {/* Path Title */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Path Title
                      </label>
                      <Input
                        placeholder="Thematic name for this storyline"
                        value={route.title}
                        onChange={(e) =>
                          updatePath(index, "title", e.target.value)
                        }
                      />
                    </div>

                    {/* Love Interest */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Love Interest (Optional)
                      </label>
                      <Select
                        value={route.loveInterest || "none"}
                        onValueChange={(value) =>
                          updatePath(
                            index,
                            "loveInterest",
                            value === "none" ? null : value,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select love interest" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            None - Not Romance Focused
                          </SelectItem>
                          {getCharacterOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Key Choices */}
                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Choices
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Critical player decisions that shape this route
                      </p>
                      <div className="space-y-2">
                        <Textarea
                          rows={3}
                          placeholder="Comma-separated list of key choices that alter the story path"
                          value={route.keyChoices}
                          onChange={(e) =>
                            updateKeyChoices(index, e.target.value)
                          }
                        />
                      </div>
                    </div>

                    {/* Path Structure */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beginning
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Description of how this route begins"
                          value={route.beginning}
                          onChange={(e) =>
                            updatePath(index, "beginning", e.target.value)
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Middle
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Description of conflict escalation and unexpected twist(s)"
                          value={route.middle}
                          onChange={(e) =>
                            updatePath(index, "middle", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Climax
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="Description of the highest tension moment of this path"
                        value={route.climax}
                        onChange={(e) =>
                          updatePath(index, "climax", e.target.value)
                        }
                      />
                    </div>

                    {/* Endings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Good Ending
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Description of the positive resolution"
                          value={route.goodEnding}
                          onChange={(e) =>
                            updatePath(index, "goodEnding", e.target.value)
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bad Ending
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Description of the negative resolution"
                          value={route.badEnding}
                          onChange={(e) =>
                            updatePath(index, "badEnding", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex justify-end">
                  <Button
                    onClick={() => handleGeneratePath(index)}
                    variant="outline"
                    className="text-primary border-primary hover:bg-primary/10 flex items-center gap-2"
                    disabled={generatingPathIndex !== null}
                  >
                    {generatingPathIndex === index ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" /> Auto-Complete
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {routes.length < 3 && (
              <Button
                onClick={addPath}
                variant="outline"
                className="w-full py-8 border-dashed border-gray-300 hover:border-primary hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add New Path
              </Button>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex items-center gap-2"
            >
              Back
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleGenerateAllPaths}
                variant="outline"
                className="flex items-center gap-2"
                disabled={generatingPathIndex !== null || routes.length === 0}
              >
                {generatingPathIndex === -1 ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    Generating All...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" /> Generate All Paths
                  </>
                )}
              </Button>

              <Button onClick={handleNext} className="flex items-center gap-2">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
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
import { useToast } from "@/hooks/use-toast";
import { validateFormContent } from "@/lib/validation";

// Extended interface for form use that includes a title property
interface RouteForm extends Route {
  title: string; // Title is used as the key in the PathsData object
}

export default function PathsForm() {
  const [, setLocation] = useLocation();
  const { projectData, setPathsData, goToStep } = useVnContext();
  const {
    generatePathData,
    generateMultiplePathsData,
    isGenerating,
    cancelGeneration,
  } = useVnData();

  // Form state
  const [routes, setRoutes] = useState<Route[]>([
    // Default empty route

    {
      title: "",
      loveInterest: null,
      keyChoices: "",
      beginning: "",
      middle: "",
      climax: "",
      goodEnding: "",
      badEnding: "",
    },
  ]);

  const [generatingPathIndex, setGeneratingPathIndex] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  
  // Save form data to context when the event is triggered
  useEffect(() => {
    const saveFormHandler = () => {
      console.log('Saving paths form data to context');
      
      // Skip if no routes or all routes are empty
      if (routes.length === 0) return;
      if (routes.every(route => !route.title)) return;
      
      // Use our savePathData helper function
      savePathData();
    };
    
    // Add event listener
    document.addEventListener('save-form-to-context', saveFormHandler);
    
    // Cleanup
    return () => {
      document.removeEventListener('save-form-to-context', saveFormHandler);
    };
  }, [routes]);

  // Load existing data if available
  useEffect(() => {
    if (projectData?.pathsData && Object.keys(projectData.pathsData).length > 0) {
      // Convert from object to array format for the form
      // Since we removed the title property from stored routes, we need to add it back for UI display
      const routesArray = Object.entries(projectData.pathsData).map(
        ([title, route]) => ({
          ...route,
          title // Add the title from the key for the form
        })
      );
      setRoutes(routesArray);
    }
  }, [projectData]);

  // Add a new path card
  const addPath = () => {
    if (routes.length >= 3) {
      alert("You can only create up to 3 paths.");
      return;
    }

    setRoutes([
      ...routes,
      {
        title: "",
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

    const updatedRoutes = [...routes];
    updatedRoutes.splice(index, 1);
    setRoutes(updatedRoutes);
  };

  // Update path field
  const updatePath = (index: number, field: keyof Route, value: any) => {
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

  // Helper function to save path data
  const savePathData = (routesToSave: Route[] = routes) => {
    // Convert array to object format for storage
    const pathsObj: Record<string, Route> = {};
    routesToSave.forEach(route => {
      if (route.title) {
        // Create a copy of the route without the redundant title property
        const { title, ...routeWithoutTitle } = route;
        // Store with title as key but don't include title in the value
        pathsObj[title] = routeWithoutTitle;
      }
    });
    
    // Set the paths data in the context
    setPathsData(pathsObj);
    
    return pathsObj;
  };

  // Generate path details using AI
  const handleGeneratePath = async (index: number) => {
    setGeneratingPathIndex(index);

    const generatedPath = await generatePathData(index, routes[index]);

    if (generatedPath) {
      const updatedRoutes = [...routes];
      updatedRoutes[index] = {
        ...updatedRoutes[index],
        ...generatedPath,
      };
      setRoutes(updatedRoutes);

      // Update the project context after path generation
      savePathData(updatedRoutes);

      // Log generation to console
      console.log(`🔥 Generated path ${index + 1}:`, generatedPath);
      console.log(`🔥 Updated project context with path ${index + 1} data`);
    }

    setGeneratingPathIndex(null);
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

      console.log(`Generating ${pathTemplates.length} paths at once...`);

      // Generate all paths in one API call
      const generatedPaths = await generateMultiplePathsData(pathTemplates);

      if (generatedPaths && Array.isArray(generatedPaths)) {
        // Merge the generated paths with existing path data
        const updatedRoutes = allRoutes.map((route, idx) => ({
          ...route,
          ...generatedPaths[idx],
        }));

        // Update state and project context
        setRoutes(updatedRoutes);
        
        // Save the path data using our helper function
        savePathData(updatedRoutes);

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
  const handleNext = async () => {
    // Local validation to ensure each path has at least a title
    const incompleteRoutes = routes.filter(route => !route.title || !route.title.trim());
    
    if (incompleteRoutes.length > 0) {
      toast({
        title: "Missing Path Names",
        description: "Please provide a title for each path before proceeding.",
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
                          placeholder="Description of positive resolution"
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
                          placeholder="Description of negative outcome"
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
                  disabled={routes.length >= 3}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add Path
                </Button>

                <Button
                  onClick={handleGenerateAllPaths}
                  variant="secondary"
                  className="flex items-center text-primary border-primary hover:bg-primary/10"
                  disabled={isGenerating || routes.length === 0}
                >
                  <Wand2 className="mr-1 h-4 w-4" />
                  {generatingPathIndex === -1 && isGenerating ? (
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
                    <>Generate All Paths</>
                  )}
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}
                  title={projectData?.charactersData ? `Back to: ${Object.keys(projectData.charactersData).length} characters` : 'Back'}
                >
                  Back
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
    </>
  );
}

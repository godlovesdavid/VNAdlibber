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

export default function PathsForm() {
  const [, setLocation] = useLocation();
  const { projectData, setPathsData, goToStep } = useVnContext();
  const { generatePathData, generateMultiplePathsData, isGenerating, cancelGeneration } = useVnData();

  // Form state
  const [routes, setRoutes] = useState<Route[]>([
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

  const [generatingPathIndex, setGeneratingPathIndex] = useState<number | null>(
    null,
  );

  // Load existing data if available
  useEffect(() => {
    if (
      projectData?.pathsData?.routes &&
      projectData.pathsData.routes.length > 0
    ) {
      setRoutes(projectData.pathsData.routes);
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
  const updateKeyChoices = (
    pathIndex: number,
    value: string,
  ) => {
    const updatedRoutes = [...routes];
    updatedRoutes[pathIndex] = {
      ...updatedRoutes[pathIndex],
      keyChoices: value,
    };
    setRoutes(updatedRoutes);
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
      setPathsData({
        routes: updatedRoutes,
      });

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
      const pathTemplates = allRoutes.map(route => ({
        title: route.title,
        loveInterest: route.loveInterest
      }));

      console.log(`Generating ${pathTemplates.length} paths at once...`);
      
      // Generate all paths in one API call
      const generatedPaths = await generateMultiplePathsData(pathTemplates);
      
      if (generatedPaths && Array.isArray(generatedPaths)) {
        // Merge the generated paths with existing path data
        const updatedRoutes = allRoutes.map((route, idx) => ({
          ...route,
          ...generatedPaths[idx]
        }));
        
        // Update state and project context
        setRoutes(updatedRoutes);
        setPathsData({
          routes: updatedRoutes
        });
        
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
    goToStep(3);
  };

  // Proceed to next step
  const handleNext = () => {
    // Validate paths
    const isValid = routes.every(
      (route) =>
        route.title &&
        route.keyChoices.trim() &&
        route.beginning &&
        route.middle &&
        route.climax &&
        route.goodEnding &&
        route.badEnding,
    );

    if (!isValid) {
      alert("Please fill in all required fields for each path");
      return;
    }

    // Save data
    setPathsData({
      routes,
    });

    // Navigate to next step
    setLocation("/create/plot");
  };

  // Get character options for love interest dropdown
  const getCharacterOptions = () => {
    if (!projectData?.charactersData?.characters) {
      return [];
    }

    return projectData.charactersData.characters.map((char, index) => ({
      label: char.name || `Character ${index + 1}`,
      value: char.name || `Character ${index + 1}`,
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
                            updateKeyChoices(
                              index,
                              e.target.value,
                            )
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
                      Generating All...
                    </>
                  ) : (
                    <>Generate All Paths</>
                  )}
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext}>Next: Plot</Button>
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

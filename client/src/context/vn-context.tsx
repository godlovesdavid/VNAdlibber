import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  BasicData,
  ConceptData,
  CharactersData,
  PathsData,
  PlotData,
  GeneratedAct,
  PlayerData,
  VnProjectData,
} from "@/types/vn";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Helper function to normalize project data for comparison
function normalizeProjectData(projectData: any): any {
  if (!projectData) return null;
  
  // Create a deep copy to avoid modifying the original
  const normalizedData = JSON.parse(JSON.stringify(projectData));

  // Remove fields that don't affect content or vary between client/server
  delete normalizedData.id;
  delete normalizedData.createdAt;
  delete normalizedData.updatedAt;
  delete normalizedData.lastSavedHash;

  return normalizedData;
}

// Function to check if two project objects are equivalent
// This preserves order and doesn't require hashing
function areProjectsEqual(projectA: any, projectB: any): boolean {
  if (!projectA || !projectB) return projectA === projectB;
  
  const normalizedA = normalizeProjectData(projectA);
  const normalizedB = normalizeProjectData(projectB);
  
  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
}

interface VnContextType {
  // UI State
  confirmDialogOpen: boolean;
  setConfirmDialogOpen: (open: boolean) => void;
  
  // Project data
  projectData: VnProjectData | null;

  // Step data setters
  setBasicData: (data: BasicData) => void;
  setConceptData: (data: ConceptData) => void;
  setCharactersData: (data: CharactersData) => void;
  setPathsData: (data: PathsData) => void;
  setPlotData: (data: PlotData) => void;
  setGeneratedAct: (actNumber: number, data: GeneratedAct) => void;

  // Player data
  playerData: PlayerData;
  updatePlayerData: (newData: Partial<PlayerData>) => void;
  resetPlayerData: () => void;

  // Project management
  createNewProject: () => void;
  saveProject: (data: VnProjectData) => Promise<any>; // Return type changed to allow returning the saved project
  loadProject: (projectId: number) => Promise<void>;
  loadFromLocalStorage: () => boolean; // Explicit function to load from localStorage
  deleteProject: (projectId: number) => Promise<void>;

  // Export functionality
  exportActs: () => Promise<void>;

  // Change detection
  hasUnsavedChanges: (projectData: VnProjectData) => boolean;

  // Navigation
  goToStep: (stepNumber: number) => void;

  // Loading states
  isLoading: boolean;
  saveLoading: boolean;
}

const defaultPlayerData: PlayerData = {
  relationships: {},
  inventory: {},
  skills: {},
  storyTitle: "", // Empty story title by default
};

// Function to check if there are unsaved changes using direct JSON comparison
export function hasUnsavedChanges(projectData: VnProjectData): boolean {
  if (!projectData) {
    console.log("[Change Check] No project data, returning false");
    return false;
  }

  // Check for a new project scenario
  if (!projectData.id) {
    const newProjectFlag = sessionStorage.getItem("vn_fresh_project");
    if (newProjectFlag === "true") {
      console.log("[Change Check] Fresh project detected, considering it saved");
      return false;
    }
  }

  // Get the saved project data from localStorage
  const projectId = projectData.id ? projectData.id.toString() : "new_project";
  const savedProjectKey = `saved_project_${projectId}`;
  const savedProjectJson = sessionStorage.getItem(savedProjectKey);
  
  if (!savedProjectJson) {
    // If no saved project data in session storage, check lastSavedHash as a proxy
    // If lastSavedHash exists, we assume it was saved at some point
    if (!projectData.lastSavedHash) {
      console.log("[Change Check] No saved project found anywhere, considering unsaved");
      return true;
    }
    console.log("[Change Check] No saved project data to compare, but lastSavedHash exists");
    return true; // Conservative approach - if we can't compare, assume there are changes
  }
  
  try {
    const savedProject = JSON.parse(savedProjectJson);
    // Compare current project with saved project using direct JSON comparison
    const areEqual = areProjectsEqual(projectData, savedProject);
    
    console.log("[Change Check] Projects equal?", areEqual);
    
    // If projects are not equal, there are unsaved changes
    return !areEqual;
  } catch (error) {
    console.error("[Change Check] Error comparing projects:", error);
    return true; // Conservative approach - if comparison fails, assume there are changes
  }
}

const VnContext = createContext<VnContextType | undefined>(undefined);

export const VnProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [projectData, setProjectData] = useState<VnProjectData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData>(defaultPlayerData);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Auto-load from localStorage on mount
  useEffect(() => {
    // Only try to load from localStorage if we don't already have project data
    if (!projectData) {
      
      const savedProject = localStorage.getItem("current_vn_project");

      if (savedProject) {
        try {
          console.log("Found saved project in localStorage, auto-loading...");
          const parsedProject = JSON.parse(savedProject);
          setProjectData(parsedProject);

          // If the project has an ID, ensure it's tracked in sessionStorage
          if (parsedProject.id) {
            sessionStorage.setItem(
              "current_project_id",
              parsedProject.id.toString(),
            );
            console.log(
              `Auto-loaded project ID ${parsedProject.id} from localStorage and stored in sessionStorage`,
            );
          }

          // Determine which step to go to based on project data
          let currentStep = 1;
          if (parsedProject.plotData) currentStep = 6;
          else if (parsedProject.pathsData) currentStep = 5;
          else if (parsedProject.charactersData) currentStep = 4;
          else if (parsedProject.conceptData) currentStep = 3;
          else if (parsedProject.basicData) currentStep = 2;
          
          // Navigate to the current step based on saved project data
          console.log("Auto-loading project and navigating to step:", currentStep);
          goToStep(currentStep);
          
          // Go to the appropriate step based on the project's current state
          //setLocation(`/create/${determineStepRoute(currentStep)}`);
        } catch (error) {
          console.error(
            "Error auto-loading saved project from localStorage:",
            error,
          );
          // Don't show an error toast for auto-loading failures
        }
      }
    }
  }, []);

  // Update localStorage when project data changes
  useEffect(() => {
    if (projectData) {
      // Store the current working project (with or without ID) in localStorage
      // This is just for maintaining current working state, not for database persistence
      localStorage.setItem("current_vn_project", JSON.stringify(projectData));

      // If this project has an ID, also store it in sessionStorage for persistence tracking
      if (projectData.id) {
        sessionStorage.setItem("current_project_id", projectData.id.toString());
        console.log(`Tracking project ID: ${projectData.id} in sessionStorage`);
      }
    }
  }, [projectData]);

  const createNewProject = () => {
    // Clear any existing project data from localStorage
    localStorage.removeItem("current_vn_project");

    // Create a new project with initial empty data
    // IMPORTANT: Do NOT include an ID field for new projects
    // This ensures it won't try to update an existing record in the database
    const initialProject: VnProjectData = {
      title: "Untitled Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), //set by server only
      basicData: {
        theme: "",
        tone: "",
        genre: "",
        setting: "",
      },
      conceptData: {
        title: "",
        tagline: "",
        premise: "",
      },
      charactersData: {},
      pathsData: {},
      plotData: {},
      generatedActs: {},
      playerData: defaultPlayerData,
      currentStep: 1,
    };

    // Save the new project data to localStorage only
    // No database interaction at this point
    localStorage.setItem("current_vn_project", JSON.stringify(initialProject));

    // Update state with the new project data
    setProjectData(initialProject);

    // Clear any previous project ID tracking
    sessionStorage.removeItem("current_project_id");

    // Set a flag to indicate this is a fresh project that needs randomization
    sessionStorage.setItem("vn_fresh_project", "true");

    // Save the normalized project data for comparison
    const normalizedData = normalizeProjectData(initialProject);
    sessionStorage.setItem("saved_project_new_project", JSON.stringify(normalizedData));
    console.log(
      `[createNewProject] Saved normalized project data for comparison`,
    );

    // Navigate to the first step
    setLocation("/create/basic");

  };

  // Step data setters
  const setBasicData = (data: BasicData) => {
    if (!projectData) return;
    setProjectData({
      ...projectData,
      basicData: data,
      currentStep: 1,
    });
  };

  const setConceptData = (data: ConceptData) => {
    if (!projectData) return;
    setProjectData({
      ...projectData,
      title: data.title || projectData.title,
      conceptData: data,
      currentStep: 2,
    });
  };

  const setCharactersData = (data: CharactersData) => {
    if (!projectData) return;

    // Set the new data while preserving the rest
    setProjectData({
      ...projectData,
      charactersData: data,
      currentStep: 3,
    });

    // Verify the data was successfully set
    setTimeout(() => {
      console.log("Characters data after update:", projectData?.charactersData);
    }, 0);
  };

  const setPathsData = (data: PathsData) => {
    if (!projectData) return;

    setProjectData({
      ...projectData,
      pathsData: data,
      currentStep: 4,
    });
  };

  const setPlotData = (data: PlotData) => {
    if (!projectData) return;

    setProjectData({
      ...projectData,
      plotData: data,
      currentStep: 5,
    });
  };

  const setGeneratedAct = (actNumber: number, data: GeneratedAct) => {
    if (!projectData) return;

    // Debug log to inspect the format of the received data
    console.log(
      `Setting generated act ${actNumber} with data format:`,
      Object.keys(data).length > 0 && !Array.isArray((data as any).scenes)
        ? "Nested format"
        : "Legacy array format",
    );

    setProjectData({
      ...projectData,
      generatedActs: {
        ...projectData.generatedActs,
        [`act${actNumber}`]: data,
      },
      currentStep: 6,
    });
  };

  // Player data management
  const updatePlayerData = (newData: Partial<PlayerData>) => {
    setPlayerData((prev) => ({
      relationships: {
        ...prev.relationships,
        ...(newData.relationships || {}),
      },
      inventory: { ...prev.inventory, ...(newData.inventory || {}) },
      skills: { ...prev.skills, ...(newData.skills || {}) },
      storyTitle:
        newData.storyTitle !== undefined ? newData.storyTitle : prev.storyTitle,
    }));

    if (projectData) {
      setProjectData({
        ...projectData,
        playerData: {
          relationships: {
            ...playerData.relationships,
            ...(newData.relationships || {}),
          },
          inventory: { ...playerData.inventory, ...(newData.inventory || {}) },
          skills: { ...playerData.skills, ...(newData.skills || {}) },
          storyTitle:
            newData.storyTitle !== undefined
              ? newData.storyTitle
              : playerData.storyTitle,
        },
      });
    }
  };

  const resetPlayerData = () => {
    setPlayerData(defaultPlayerData);

    if (projectData) {
      setProjectData({
        ...projectData,
        playerData: defaultPlayerData,
      });
    }
  };

  // Save project to server, by comparing changes
  const saveProject = async (projectData: VnProjectData) => {
    try {
      setSaveLoading(true);
      // 1. Always check localStorage first for most up-to-date data
      // This addresses race conditions between form data saves and API requests
      console.log("Loading project data to save");
      if (!hasUnsavedChanges(projectData)) 
      {
        console.log('[saveProject] No changes detected, skipping save operation');
        toast({
          title: "No Changes",
          description: "No changes to save",
        });
        return;
      }
      // Use projectData as default but prioritize localStorage
      let dataToSave = projectData;
      // Check localStorage for most recent data
      // const localStorageData = localStorage.getItem("current_vn_project");
      // if (localStorageData) {
      //   try {
      //     const parsedData = JSON.parse(localStorageData);
      //     console.log(
      //       "Using localStorage data for saving:",
      //       parsedData.basicData,
      //     );
      //     dataToSave = parsedData;
      //   } catch (e) {
      //     console.error("Failed to parse localStorage data:", e);
      //   }
      // }

      if (!dataToSave) {
        throw new Error("No project data to save");
      }

      // Check if we have a stored ID in session storage
      // This is more reliable than the dataToSave.id since createNewProject may have cleared the ID from projectData
      const storedProjectId = sessionStorage.getItem("current_project_id");

      // Save the normalized project data for comparison
      const normalizedData = normalizeProjectData(dataToSave);
      console.log(
        "[saveProject] Created normalized data for comparison"
      );
      console.log(
        "[saveProject] Data to save has lastSavedHash:",
        dataToSave.lastSavedHash,
      );

      // 2. Make sure we have all required fields with defaults
      // const finalDataToSave = {
      // ...dataToSave,
      // ...(storedProjectId ? { id: parseInt(storedProjectId) } : {}),
      // playerData: dataToSave.playerData || defaultPlayerData,
      // currentStep: dataToSave.currentStep,
      // lastSavedHash: currentDataHash
      // };

      console.log("Saving data to server:", dataToSave.basicData);
      // 3. Send to API - determine if it's an update or new project
      let response;
      if (dataToSave.id) {
        // It's an existing project, use the ID to update it
        console.log(`Updating existing project with ID ${dataToSave.id}`);
        response = await apiRequest("POST", "/api/projects", dataToSave);
      } else {
        // It's a new project
        console.log("Creating new project in database");
        response = await apiRequest("POST", "/api/projects", dataToSave);
      }

      const savedProject = await response.json();

      // 4. Update state with saved data, ensuring we preserve the ID and hash
      console.log(
        "Received saved project from server with ID:",
        savedProject.id,
      );
      console.log(
        "Received saved project hash from server:",
        savedProject.lastSavedHash,
      );

      // Store the ID in session storage for future saves
      sessionStorage.setItem("current_project_id", savedProject.id.toString());

      // We don't need to worry about hash synchronization anymore
      // Just make sure lastSavedHash exists for backward compatibility
      if (!savedProject.lastSavedHash) {
        console.log("Adding placeholder lastSavedHash for backward compatibility");
        // Generate a timestamp-based placeholder hash for backward compatibility
        savedProject.lastSavedHash = `save-${Date.now()}`;
      }

      // Store normalized data for equality comparison
      const serverNormalizedData = normalizeProjectData(savedProject);
      console.log("Saved normalized server data for comparison");
      console.log(
        "Data is equivalent?",
        areProjectsEqual(savedProject, dataToSave),
      );

      // Update React state
      setProjectData(savedProject);

      // 5. Also update localStorage for consistency
      localStorage.setItem("current_vn_project", JSON.stringify(savedProject));

      // 6. Record normalized project data in session storage for client-side change detection
      const projectId = savedProject.id
        ? savedProject.id.toString()
        : "new_project";
      const savedProjectKey = `saved_project_${projectId}`;
      sessionStorage.setItem(savedProjectKey, JSON.stringify(serverNormalizedData));
      console.log(
        `[saveProject] Saving normalized project data in session storage with key ${savedProjectKey}`,
      );

      // Also clear the new project time and other tracker values
      sessionStorage.removeItem("vn_new_project_time");
      sessionStorage.removeItem("vn_fresh_project");

      // 7. Invalidate the projects query to refresh the project list
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      toast({
        title: "Success",
        description: "Project saved successfully",
      });

      return savedProject;
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
      throw error; // Re-throw to allow callers to handle the error
    } finally {
      setSaveLoading(false);
    }
  };

  // Load project from server
  const loadProject = async (projectId: number) => {
    try {
      setIsLoading(true);
      
      // Set a flag to indicate we're explicitly loading a project
      // This will prevent the auto-load from localStorage from overriding our data
      sessionStorage.setItem("recently_loaded_project", "true");

      const response = await apiRequest("GET", `/api/projects/${projectId}`);
      const loadedProject = await response.json();

      // Make sure the loaded project has all required fields
      if (!loadedProject.basicData) {
        loadedProject.basicData = {
          theme: "",
          tone: "",
          genre: "",
        };
      }

      // Store the project ID in session storage for persistence tracking
      sessionStorage.setItem("current_project_id", projectId.toString());
      console.log(
        `Loaded project ID ${projectId} and stored in sessionStorage`,
      );

      // Generate normalized project data for comparison
      const normalizedData = normalizeProjectData(loadedProject);
      console.log(
        `[loadProject] Generated normalized data for loaded project for comparison`,
      );

      // Ensure the loaded project has a lastSavedHash for backward compatibility
      if (!loadedProject.lastSavedHash) {
        loadedProject.lastSavedHash = `load-${Date.now()}`;
      }

      // IMPORTANT: Force localStorage update with the loaded project FIRST
      localStorage.setItem("current_vn_project", JSON.stringify(loadedProject));

      // Store the normalized project in session storage for our direct comparison
      const savedProjectKey = `saved_project_${projectId}`;
      sessionStorage.setItem(savedProjectKey, JSON.stringify(normalizedData));
      console.log(
        `[loadProject] Saving normalized project data in session storage with key ${savedProjectKey}`,
      );
      // Clear any "fresh project" flags
      sessionStorage.removeItem("vn_fresh_project");

      // Set project data in state
      setProjectData(loadedProject);
      
      // Set player data if it exists
      if (loadedProject.playerData) {
        setPlayerData(loadedProject.playerData);
      } else {
        resetPlayerData();
      }

      // Navigate to appropriate step
      const stepRoutes = [
        "/create/basic",
        "/create/concept",
        "/create/characters",
        "/create/paths",
        "/create/plot",
        "/create/generate-vn",
      ];

      setLocation(stepRoutes[loadedProject.currentStep - 1] || "/create/basic");
      // alert(JSON.stringify(loadedProject))
      toast({
        title: "Success",
        description: "Project loaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete project
  const deleteProject = async (projectId: number) => {
    try {
      await apiRequest("DELETE", `/api/projects/${projectId}`);

      // Check if the deleted project is the currently active one
      const currentId = sessionStorage.getItem("current_project_id");
      if (currentId && parseInt(currentId) === projectId) {
        // If we're deleting the active project, clear the ID from sessionStorage
        console.log(
          `Clearing active project ID ${projectId} from sessionStorage`,
        );
        sessionStorage.removeItem("current_project_id");

        // Also clear localStorage if it contains this project
        const localProject = localStorage.getItem("current_vn_project");
        if (localProject) {
          try {
            const parsed = JSON.parse(localProject);
            if (parsed.id === projectId) {
              localStorage.removeItem("current_vn_project");
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });

      return Promise.resolve();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });

      return Promise.reject(error);
    }
  };

  // Export acts
  const exportActs = async () => {
    if (!projectData || !projectData.generatedActs) {
      toast({
        title: "Error",
        description: "No acts to export",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // For each generated act, export to a downloadable JSON file
      Object.entries(projectData.generatedActs).forEach(([actKey, actData]) => {
        const actNumber = actKey.replace("act", "");
        const fileName = `${projectData.title.replace(/\s+/g, "_")}-Act${actNumber}.json`;

        // Create a blob and download link
        const blob = new Blob([JSON.stringify(actData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Clean up - immediately, no delay needed
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      toast({
        title: "Success",
        description: "Acts exported successfully",
      });
    } catch (error) {
      console.error("Error exporting acts:", error);
      toast({
        title: "Error",
        description: "Failed to export acts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation between steps
  const goToStep = (stepNumber: number) => {
    if (!projectData) return;

    const currentStep = projectData.currentStep;

    // If going backwards, just update the step without erasing data
    // This preserves continuity while allowing changes
    if (stepNumber < currentStep) {
      // The confirmation modal is now handled in the generate-vn-form.tsx component
      // to provide a better user experience with warnings about continuity
      const updatedProject: VnProjectData = {
        ...projectData,
        currentStep: stepNumber,
      };

      setProjectData(updatedProject);
    }

    // Navigate to appropriate step
    const stepRoutes = [
      "/create/basic",
      "/create/concept",
      "/create/characters",
      "/create/paths",
      "/create/plot",
      "/create/generate-vn",
    ];

    setLocation(stepRoutes[stepNumber - 1]);
  };

  // Add explicit function to load from localStorage only - for continuing where they left off
  const loadFromLocalStorage = () => {
    const savedProject = localStorage.getItem("current_vn_project");
    if (savedProject) {
      try {
        const parsedProject = JSON.parse(savedProject);
        setProjectData(parsedProject);

        // If the project has an ID, ensure it's tracked in sessionStorage
        if (parsedProject.id) {
          sessionStorage.setItem(
            "current_project_id",
            parsedProject.id.toString(),
          );
          console.log(
            `Loaded project ID ${parsedProject.id} from localStorage and stored in sessionStorage`,
          );
        }

        // We don't automatically navigate to the last step anymore
        // Instead, we stay on the main menu so the user always starts fresh
        console.log("Project loaded from localStorage but staying on main menu");
        
        // Don't navigate automatically - user must click "Continue" on main menu
        // This ensures a consistent user experience each time they open the app

        return true; // Successfully loaded
      } catch (error) {
        console.error("Error loading saved project from localStorage:", error);
        toast({
          title: "Error",
          description: "Failed to load the last project you were working on.",
          variant: "destructive",
        });
        return false;
      }
    }
    return false; // No project in localStorage
  };

  const value: VnContextType = {
    confirmDialogOpen,
    setConfirmDialogOpen,
    projectData,
    setBasicData,
    setConceptData,
    setCharactersData,
    setPathsData,
    setPlotData,
    setGeneratedAct,
    playerData,
    updatePlayerData,
    resetPlayerData,
    createNewProject,
    saveProject,
    loadProject,
    loadFromLocalStorage,
    deleteProject,
    exportActs,
    hasUnsavedChanges,
    goToStep,
    isLoading,
    saveLoading,
  };

  return <VnContext.Provider value={value}>{children}</VnContext.Provider>;
};

export const useVnContext = () => {
  const context = useContext(VnContext);
  if (context === undefined) {
    throw new Error("useVnContext must be used within a VnProvider");
  }
  return context;
};

// Needed for proper Fast Refresh support
// eslint-disable-next-line
export default useVnContext;

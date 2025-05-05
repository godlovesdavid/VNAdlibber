import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  BasicData,
  ConceptData,
  CharactersData,
  Character,
  PathsData,
  PlotData,
  GeneratedAct,
  PlayerData,
  VnProjectData,
} from "@/types/vn";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Helper function to create a hash/checksum of project data
function generateProjectHash(projectData: any): string {
  // Create a normalized version of the data without irrelevant fields
  const normalizedData = { ...projectData };
  
  // Remove fields that don't affect content or vary between client/server
  delete normalizedData.id;
  delete normalizedData.createdAt;
  delete normalizedData.updatedAt;
  delete normalizedData.lastSavedHash;
  
  // // Create a stable JSON string with sorted keys
  // // This ensures consistent hashing even if object properties are in different order
  // function stableStringify(obj: any): string {
  //   if (typeof obj !== 'object' || obj === null) {
  //     return JSON.stringify(obj);
  //   }
    
  //   const sortedKeys = Object.keys(obj).sort();
  //   const pairs = sortedKeys.map(key => {
  //     return `"${key}":${stableStringify(obj[key])}`;
  //   });
    
  //   if (Array.isArray(obj)) {
  //     return `[${pairs.join(',')}]`;
  //   } else {
  //     return `{${pairs.join(',')}}`;  
  //   }
  // }

  // const str = stableStringify(normalizedData);
  const str = JSON.stringify(normalizedData);
  
  // Use a more reliable hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Helper function to calculate the current step based on a project's data
export function calculateCurrentStep(project: Partial<VnProjectData>): number {
  let step = 1; // Start with basic step
  
  // Check what data is present and calculate the appropriate step
  if (project.basicData && Object.keys(project.basicData).length > 0 && 
      project.basicData.theme && project.basicData.tone && project.basicData.genre) {
    step = 2; // Concept step
  }
  
  if (project.conceptData && Object.keys(project.conceptData).length > 0 && 
      project.conceptData.title && project.conceptData.premise) {
    step = 3; // Characters step
  }
  
  if (project.charactersData && Object.keys(project.charactersData).length > 0) {
    step = 4; // Paths step
  }
  
  if (project.pathsData && Object.keys(project.pathsData).length > 0) {
    step = 5; // Plot step
  }
  
  if (project.plotData && Object.keys(project.plotData).length > 0) {
    step = 6; // Generate step
  }
  
  return step;
}

interface VnContextType {
  // Project data
  projectData: VnProjectData | null;

  // Step data setters
  setBasicData: (data: BasicData) => void;
  setConceptData: (data: ConceptData) => void;
  setCharactersData: (data: CharactersData, protagonist?: string) => void;
  setPathsData: (data: PathsData) => void;
  setPlotData: (data: PlotData) => void;
  setGeneratedAct: (actNumber: number, data: GeneratedAct) => void;

  // Player data
  playerData: PlayerData;
  updatePlayerData: (newData: Partial<PlayerData>) => void;
  resetPlayerData: () => void;

  // Project management
  createNewProject: () => void;
  saveProject: () => Promise<any>; // Return type changed to allow returning the saved project
  loadProject: (projectId: number) => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;

  // Export functionality
  exportActs: () => Promise<void>;
  
  // Change detection
  hasUnsavedChanges: () => boolean;

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

// Function to check if there are unsaved changes using pure hash comparison
export function hasUnsavedChanges(projectData: VnProjectData | null): boolean {
  if (!projectData) {
    console.log('[Hash Check] No project data, returning false');
    return false;
  }
  
  // Get the current hash of the project data
  const currentHash = generateProjectHash(projectData);
  console.log('[Hash Check] Generated current hash:', currentHash);
  
  // Check for a new project scenario
  if (!projectData.id) {
    const newProjectFlag = sessionStorage.getItem('vn_fresh_project');
    if (newProjectFlag === 'true') {
      console.log('[Hash Check] Fresh project detected, considering it saved');
      return false;
    }
  }
  
  // Get the last saved hash from session storage instead of the project object
  // This way we're comparing against what WE saved, not what the server returned
  const projectId = projectData.id ? projectData.id.toString() : 'new_project';
  const savedHashKey = `saved_hash_${projectId}`;
  const savedHash = sessionStorage.getItem(savedHashKey);
  
  if (!savedHash) {
    // If we don't have a saved hash in session storage, check the project object
    if (!projectData.lastSavedHash) {
      console.log('[Hash Check] No saved hash found anywhere, considering unsaved');
      return true;
    }
    // Use the hash from the project object as fallback
    console.log('[Hash Check] Using hash from project object as fallback');
    return currentHash !== projectData.lastSavedHash;
  }
  
  // Compare the current hash with the saved hash from session storage
  const hashesMatch = currentHash === savedHash;
  
  console.log('[Hash Check] Current hash:', currentHash);
  console.log('[Hash Check] Session saved hash:', savedHash);
  console.log('[Hash Check] Hashes match?', hashesMatch);
  
  // If hashes don't match, the project has unsaved changes
  return !hashesMatch;
}

const VnContext = createContext<VnContextType | undefined>(undefined);

export const VnProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [projectData, setProjectData] = useState<VnProjectData | null>(null);
  const [playerData, setPlayerData] = useState<PlayerData>(defaultPlayerData);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Load project from localStorage on mount
  useEffect(() => {
    const savedProject = localStorage.getItem("current_vn_project");
    if (savedProject) {
      try {
        setProjectData(JSON.parse(savedProject));
      } catch (error) {
        console.error("Error loading saved project from localStorage:", error);
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
      updatedAt: new Date().toISOString(),
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
    sessionStorage.removeItem('current_project_id');
    
    // Set a flag to indicate this is a fresh project that needs randomization
    sessionStorage.setItem('vn_fresh_project', 'true');
    
    // Create a hash for the fresh project and save it to session storage
    const initialHash = generateProjectHash(initialProject);
    sessionStorage.setItem('saved_hash_new_project', initialHash);
    console.log(`[createNewProject] Created initial project hash: ${initialHash}`);
    
    // Navigate to the first step
    setLocation("/create/basic");
    
    // Show confirmation toast
    toast({
      title: "New Project Created",
      description: "Starting with a fresh project. Changes will be saved when you click Save Project.",
      duration: 3000,
    });
  };

  // Step data setters
  const setBasicData = (data: BasicData) => {
    if (!projectData) return;

    setProjectData({
      ...projectData,
      basicData: data,
      currentStep: Math.max(projectData.currentStep, 1),
      updatedAt: new Date().toISOString(),
    });
  };

  const setConceptData = (data: ConceptData) => {
    if (!projectData) return;

    setProjectData({
      ...projectData,
      title: data.title || projectData.title,
      conceptData: data,
      currentStep: Math.max(projectData.currentStep, 2),
      updatedAt: new Date().toISOString(),
    });
  };

  const setCharactersData = (data: CharactersData, protagonist?: string) => {
    if (!projectData) return;

    console.log("Setting character data in context:", data);
    console.log("Setting protagonist:", protagonist);

    // Deep check of character data structure
    const characterNames = Object.keys(data);
    console.log(
      `Received ${characterNames.length} characters:`,
      characterNames,
    );

    // Create a sanitized copy of the character data with fixed structure
    const sanitizedData: CharactersData = {};

    // Check if each character has the expected structure
    characterNames.forEach((name) => {
      const character = data[name];
      console.log(
        `Character ${name} object structure:`,
        Object.keys(character),
      );

      // Create a new clean character object with correct typing
      const cleanCharacter: Record<string, any> = {};

      // Check for any unexpected nested objects and fix them
      Object.entries(character).forEach(([key, value]) => {
        // Skip numeric keys (prevent array indexes from being treated as properties)
        if (!isNaN(Number(key))) {
          console.log(`Skipping numeric key ${key} in character ${name}`);
          return;
        }

        // Handle nested objects - convert to string representations except relationshipPotential
        if (
          typeof value === "object" &&
          value !== null &&
          key !== "relationshipPotential"
        ) {
          console.log(
            `WARNING: Character ${name} has nested object in property ${key}:`,
            value,
          );
          console.log(`Converting nested object to string`);
          cleanCharacter[key] = JSON.stringify(value);
        } else {
          cleanCharacter[key] = value;
        }
      });

      // Verify Character has the expected fields
      const expectedKeys = [
        "role",
        "occupation",
        "gender",
        "age",
        "appearance",
        "personality",
        "goals",
        "relationshipPotential",
        "conflict",
      ];
      const missingKeys = expectedKeys.filter(
        (key) => !(key in cleanCharacter),
      );
      if (missingKeys.length > 0) {
        console.log(
          `WARNING: Character ${name} is missing expected fields:`,
          missingKeys,
        );

        // Add placeholder values for missing keys
        missingKeys.forEach((key) => {
          if (key === "relationshipPotential") {
            // For missing relationshipPotential, set to null for protagonist, empty string for others
            cleanCharacter[key] = name === protagonist ? null : "";
          } else {
            cleanCharacter[key] = `To be defined`;
            console.log(`Added placeholder for ${key} in character ${name}`);
          }
        });
      }

      // Add the cleaned character to the sanitized data with proper typing
      // Create a properly typed Character object from the cleaned data
      const typedCharacter: Character = {
        role: name === protagonist
        ? "Protagonist"
        : cleanCharacter.role || "",
        occupation: cleanCharacter.occupation || "To be defined",
        gender: cleanCharacter.gender || "To be defined",
        age: cleanCharacter.age || "To be defined",
        appearance: cleanCharacter.appearance || "To be defined",
        personality: cleanCharacter.personality || "To be defined",
        goals: cleanCharacter.goals || "To be defined",
        relationshipPotential:
          name === protagonist
            ? "N/A"
            : cleanCharacter.relationshipPotential || "",
        conflict: cleanCharacter.conflict || "To be defined",
      };

      sanitizedData[name] = typedCharacter;
    });

    console.log("Sanitized character data for storage:", sanitizedData);

    // Set the new data while preserving the rest
    setProjectData({
      ...projectData,
      charactersData: sanitizedData,
      protagonist: protagonist || projectData.protagonist,
      currentStep: Math.max(projectData.currentStep, 3),
      updatedAt: new Date().toISOString(),
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
      currentStep: Math.max(projectData.currentStep, 4),
      updatedAt: new Date().toISOString(),
    });
  };

  const setPlotData = (data: PlotData) => {
    if (!projectData) return;

    setProjectData({
      ...projectData,
      plotData: data,
      currentStep: Math.max(projectData.currentStep, 5),
      updatedAt: new Date().toISOString(),
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
      currentStep: Math.max(projectData.currentStep, 6),
      updatedAt: new Date().toISOString(),
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
      storyTitle: newData.storyTitle !== undefined ? newData.storyTitle : prev.storyTitle,
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
          storyTitle: newData.storyTitle !== undefined ? newData.storyTitle : playerData.storyTitle,
        },
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const resetPlayerData = () => {
    setPlayerData(defaultPlayerData);

    if (projectData) {
      setProjectData({
        ...projectData,
        playerData: defaultPlayerData,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Save project to server
  const saveProject = async () => {
    try {
      setSaveLoading(true);
      
      // 1. Always check localStorage first for most up-to-date data
      // This addresses race conditions between form data saves and API requests
      console.log('Loading project data to save');
      
      // Use projectData as default but prioritize localStorage
      let dataToSave = projectData;
      
      // Check localStorage for most recent data
      const localStorageData = localStorage.getItem("current_vn_project");
      if (localStorageData) {
        try {
          const parsedData = JSON.parse(localStorageData);
          console.log('Using localStorage data for saving:', parsedData.basicData);
          dataToSave = parsedData;
        } catch (e) {
          console.error('Failed to parse localStorage data:', e);
        }
      }
      
      if (!dataToSave) {
        throw new Error('No project data to save');
      }
      
      // Check if we have a stored ID in session storage
      // This is more reliable than the dataToSave.id since createNewProject may have cleared the ID from projectData
      const storedProjectId = sessionStorage.getItem('current_project_id');
      
      // Calculate the correct step based on available data
      const calculatedStep = calculateCurrentStep(dataToSave);
      
      
      // Generate a hash of the essential data only
      const currentDataHash = generateProjectHash(dataToSave);
      console.log('[saveProject] Generated hash for essential project data:', currentDataHash);
      console.log('[saveProject] Data to save has lastSavedHash:', dataToSave.lastSavedHash);

      // Get project ID from either the data or session storage
      const projectId = dataToSave.id || sessionStorage.getItem('current_project_id') || 'new_project';
      const savedHashKey = `saved_hash_${projectId}`;
      
      // Compare hashes
      if (currentDataHash === sessionStorage?.getItem(savedHashKey)) {
        console.log('[saveProject] No changes detected, skipping save operation');
        toast({
          title: "No Changes",
          description: "No changes to save",
        });
        return dataToSave; // Return the existing data
      }
      
      // 2. Make sure we have all required fields with defaults
      const finalDataToSave = {
        ...dataToSave,
        // Use the stored ID if available (for updates)
        ...(storedProjectId ? { id: parseInt(storedProjectId) } : {}),
        basicData: dataToSave.basicData || {},
        conceptData: dataToSave.conceptData || {},
        charactersData: dataToSave.charactersData || {},
        pathsData: dataToSave.pathsData || {},
        plotData: dataToSave.plotData || {},
        playerData: dataToSave.playerData || defaultPlayerData,
        // Use our calculated step instead of relying on the stored value
        currentStep: calculatedStep,
        updatedAt: new Date().toISOString(),
        // Add the hash of the current state to track changes
        lastSavedHash: currentDataHash
      };
      
      console.log('Saving data to server:', finalDataToSave.basicData);
      
      // 3. Send to API - determine if it's an update or new project
      let response;
      if (finalDataToSave.id) {
        // It's an existing project, use the ID to update it
        console.log(`Updating existing project with ID ${finalDataToSave.id}`);
        response = await apiRequest("POST", "/api/projects", finalDataToSave);
      } else {
        // It's a new project
        console.log('Creating new project in database');
        response = await apiRequest("POST", "/api/projects", finalDataToSave);
      }
      
      const savedProject = await response.json();
      
      // 4. Update state with saved data, ensuring we preserve the ID and hash
      console.log('Received saved project from server with ID:', savedProject.id); 
      console.log('Received saved project hash from server:', savedProject.lastSavedHash);
      
      // Store the ID in session storage for future saves
      sessionStorage.setItem('current_project_id', savedProject.id.toString());
      
      // Make sure the saved project has the hash - always use the hash we generated and sent
      // This ensures client and server stay in sync with hash values
      if (!savedProject.lastSavedHash) {
        console.log('Warning: Server returned project without hash, using client hash', currentDataHash);
        savedProject.lastSavedHash = currentDataHash;
      } else if (savedProject.lastSavedHash !== currentDataHash) {
        console.log('Warning: Server returned different hash than client generated', { 
          server: savedProject.lastSavedHash, 
          client: currentDataHash 
        });
        // Override the server hash with our client hash since we just saved
        // This keeps the client's perception of "saved state" accurate
        savedProject.lastSavedHash = currentDataHash;
      }
      
      // Generate a hash of the server-returned data to verify true equality
      const serverDataHash = generateProjectHash(savedProject);
      console.log('Hash of data returned by server:', serverDataHash);
      console.log('Hash matches client hash?', serverDataHash === currentDataHash);
      
      // Update React state
      setProjectData(savedProject);
      
      // 5. Also update localStorage for consistency
      localStorage.setItem("current_vn_project", JSON.stringify(savedProject));
      
      // 6. Record hash in session storage for client-side change detection
      const projectId = savedProject.id ? savedProject.id.toString() : 'new_project';
      const savedHashKey = `saved_hash_${projectId}`;
      sessionStorage.setItem(savedHashKey, currentDataHash);
      console.log(`[saveProject] Saving hash ${currentDataHash} in session storage with key ${savedHashKey}`);
      
      // Also clear the new project time and other tracker values
      sessionStorage.removeItem('vn_new_project_time');
      sessionStorage.removeItem('vn_fresh_project');
      
      // 7. Invalidate the projects query to refresh the project list
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

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
      
      // Recalculate current step based on available data
      const calculatedStep = calculateCurrentStep(loadedProject);
      
      // Update the currentStep value based on our calculation
      loadedProject.currentStep = calculatedStep;

      // Store the project ID in session storage for persistence tracking
      sessionStorage.setItem('current_project_id', projectId.toString());
      console.log(`Loaded project ID ${projectId} and stored in sessionStorage`);

      // Generate a hash for loaded project for proper change tracking
      const loadedHash = generateProjectHash(loadedProject);
      console.log(`[loadProject] Generated hash for loaded project: ${loadedHash}`);
      
      // Ensure the loaded project has the hash for change detection
      loadedProject.lastSavedHash = loadedHash;
      
      // IMPORTANT: Force localStorage update with the loaded project FIRST
      localStorage.setItem("current_vn_project", JSON.stringify(loadedProject));
      
      // Store the hash in session storage for our pure client-side change detection
      const savedHashKey = `saved_hash_${projectId}`;
      sessionStorage.setItem(savedHashKey, loadedHash);
      console.log(`[loadProject] Saving hash ${loadedHash} in session storage with key ${savedHashKey}`);

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
      const currentId = sessionStorage.getItem('current_project_id');
      if (currentId && parseInt(currentId) === projectId) {
        // If we're deleting the active project, clear the ID from sessionStorage
        console.log(`Clearing active project ID ${projectId} from sessionStorage`);
        sessionStorage.removeItem('current_project_id');
        
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

  const value: VnContextType = {
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
    deleteProject,
    exportActs,
    hasUnsavedChanges: () => hasUnsavedChanges(projectData),
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

import React, { createContext, useContext, useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/queryClient";

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
  saveProject: () => Promise<void>;
  loadProject: (projectId: number) => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;
  
  // Export functionality
  exportActs: () => Promise<void>;
  
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
};

const VnContext = createContext<VnContextType | undefined>(undefined);

export const VnProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
      localStorage.setItem("current_vn_project", JSON.stringify(projectData));
    }
  }, [projectData]);
  
  // Create a new project
  const createNewProject = () => 
  {
    // First create a clean minimal basic structure
    const initialProject: VnProjectData = {
      title: "Untitled Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      basicData: {
        theme: "",
        tone: "",
        genre: "",
      },
      currentStep: 1
    };
    
    // Clear any existing project data
    try 
    {
      // Remove old data from storage
      localStorage.removeItem("current_vn_project");
      sessionStorage.removeItem('vn_fresh_project');
      
      // Important: Set the new project data in localStorage FIRST, before updating state
      localStorage.setItem("current_vn_project", JSON.stringify(initialProject));
    } 
    catch (e) 
    {
      // Show error toast if localStorage operations fail
      toast({
        title: "Error",
        description: "Failed to create new project storage",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // IMPORTANT: Update state AFTER storage is updated
    setProjectData(initialProject);
    resetPlayerData();
    
    // Navigate to the first step
    setLocation("/create/basic");
    
    // Show confirmation toast
    toast({
      title: "New Project Created",
      description: "Starting with a fresh project",
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
    
    setProjectData({
      ...projectData,
      charactersData: data,
      protagonist: protagonist || projectData.protagonist,
      currentStep: Math.max(projectData.currentStep, 3),
      updatedAt: new Date().toISOString(),
    });
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
    setPlayerData(prev => ({
      relationships: { ...prev.relationships, ...(newData.relationships || {}) },
      inventory: { ...prev.inventory, ...(newData.inventory || {}) },
      skills: { ...prev.skills, ...(newData.skills || {}) },
    }));
    
    if (projectData) {
      setProjectData({
        ...projectData,
        playerData: {
          relationships: { ...playerData.relationships, ...(newData.relationships || {}) },
          inventory: { ...playerData.inventory, ...(newData.inventory || {}) },
          skills: { ...playerData.skills, ...(newData.skills || {}) },
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
    if (!projectData) {
      toast({
        title: "Error",
        description: "No project data to save",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaveLoading(true);
      const response = await apiRequest("POST", "/api/projects", {
        ...projectData,
        updatedAt: new Date().toISOString(),
      });
      
      const savedProject = await response.json();
      setProjectData(savedProject);
      
      toast({
        title: "Success",
        description: "Project saved successfully",
      });
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description: "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Load project from server
  const loadProject = async (projectId: number) => 
  {
    try 
    {
      setIsLoading(true);
      
      const response = await apiRequest("GET", `/api/projects/${projectId}`);
      const loadedProject = await response.json();
      
      // Make sure the loaded project has all required fields
      if (!loadedProject.basicData) 
      {
        loadedProject.basicData = {
          theme: "",
          tone: "",
          genre: ""
        };
      }
      
      // IMPORTANT: Force localStorage update with the loaded project FIRST
      localStorage.setItem("current_vn_project", JSON.stringify(loadedProject));
      
      // Clear any "fresh project" flags
      sessionStorage.removeItem('vn_fresh_project');
      
      // Set project data in state
      setProjectData(loadedProject);
      
      // Set player data if it exists
      if (loadedProject.playerData) 
      {
        setPlayerData(loadedProject.playerData);
      } 
      else 
      {
        resetPlayerData();
      }
      
      // Navigate to appropriate step
      const stepRoutes = [
        '/create/basic',
        '/create/concept',
        '/create/characters',
        '/create/paths',
        '/create/plot',
        '/create/generate-vn'
      ];
      
      setLocation(stepRoutes[loadedProject.currentStep - 1] || '/create/basic');
      
      toast({
        title: "Success",
        description: "Project loaded successfully",
      });
    } 
    catch (error) 
    {
      toast({
        title: "Error",
        description: "Failed to load project",
        variant: "destructive",
      });
    } 
    finally 
    {
      setIsLoading(false);
    }
  };
  
  // Delete project
  const deleteProject = async (projectId: number) => {
    try {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
      
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
        const actNumber = actKey.replace('act', '');
        const fileName = `${projectData.title.replace(/\s+/g, '_')}-Act${actNumber}.json`;
        
        // Create a blob and download link
        const blob = new Blob([JSON.stringify(actData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
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
        currentStep: stepNumber 
      };
      
      setProjectData(updatedProject);
    }
    
    // Navigate to appropriate step
    const stepRoutes = [
      '/create/basic',
      '/create/concept',
      '/create/characters',
      '/create/paths',
      '/create/plot',
      '/create/generate-vn'
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

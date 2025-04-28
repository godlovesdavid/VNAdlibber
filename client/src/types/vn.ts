// Basic settings for the visual novel
export interface BasicData {
  theme: string;
  tone: string;
  genre: string;
}

// Concept information for the visual novel
export interface ConceptData {
  title: string;
  tagline: string;
  premise: string;
}

// Character definition
export interface Character {
  name: string;
  role: string;
  occupation: string;  // Added occupation field to distinguish from role
  gender: string;
  age: string;
  appearance: string;
  personality: string;
  goals: string;
  relationshipPotential: string;
  conflict: string;
}

// Characters data containing all characters
export interface CharactersData {
  characters: Character[];
}

// Definition of a story route
export interface Route {
  title: string;
  loveInterest: string | null;
  keyChoices: string;  // Changed from array to a single text area
  beginning: string;
  middle: string;
  climax: string;
  goodEnding: string;
  badEnding: string;
}

// Paths data containing all routes
export interface PathsData {
  routes: Route[];
}

// Structure for plot acts
export interface PlotAct {
  title: string;
  summary: string;
  events: string[];
  arcsActivated: string[];
  arcIntersections: string[];
  playerChoices: string[];
}

// Plot outline structure
export interface PlotData {
  plotOutline: {
    act1: PlotAct;
    act2: PlotAct;
    act3: PlotAct;
    act4: PlotAct;
    act5: PlotAct;
  };
}

// Scene choice structure
export interface SceneChoice {
  id: string;
  text?: string;
  description?: string; // Added description field for choice consequences explanation
  delta?: Record<string, number>;
  next: string;
  condition?: Record<string, number>;
  failNext?: string;
}

// Visual novel scene structure
export interface Scene {
  id: string;
  setting: string;
  bg?: string;
  dialogue: [string, string][];
  choices: SceneChoice[] | null;
}

// Generated act structure
export interface GeneratedAct {
  meta: {
    theme: string;
    relationshipVars: string[];
  };
  scenes: Scene[];
}

// Player data structure for tracking relationships, inventory, and skills
export interface PlayerData {
  relationships: Record<string, number>;
  inventory: Record<string, number>;
  skills: Record<string, number>;
}

// Complete VN Project data structure
export interface VnProjectData {
  id?: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  basicData: BasicData;
  conceptData?: ConceptData;
  charactersData?: CharactersData;
  pathsData?: PathsData;
  plotData?: PlotData;
  generatedActs?: Record<string, GeneratedAct>;
  playerData?: PlayerData;
  currentStep: number;
}

// Exported story structure
export interface VnStory {
  id: number;
  title: string;
  createdAt: string;
  actData: GeneratedAct;
  actNumber: number;
}

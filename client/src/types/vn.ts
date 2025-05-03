// Basic settings for the visual novel
export interface BasicData {
  theme: string;
  tone: string;
  genre: string;
  setting?: string; // Optional to maintain backward compatibility
}

// Concept information for the visual novel
export interface ConceptData {
  title: string;
  tagline: string;
  premise: string;
}

// Character definition
export interface Character {
  role: string;
  occupation: string; // Added occupation field to distinguish from role
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
  [name: string]: Character;
}

// Definition of a story route
export interface Route {
  title?: string; // Title is optional since it's already used as the key in PathsData
  loveInterest: string | null;
  keyChoices: string; // Changed from array to a single text area
  beginning: string;
  middle: string;
  climax: string;
  goodEnding: string;
  badEnding: string;
}

// Paths data containing all routes
export interface PathsData {
  [title: string]: Route;
}

// Structure for plot acts
export interface PlotAct {
  title?: string; // Optional title property for backward compatibility
  summary: string;
  events: string[];
  arcsActivated: string[];
  arcIntersections: string[];
  playerChoices: string[];
}

// Plot outline structure
export interface PlotData {
  [title: string]: PlotAct;
}

// Scene choice structure
export interface SceneChoice {
  text?: string;
  description?: string; // Added description field for choice consequences explanation
  delta?: Record<string, number>;
  next: string;
  condition?: Record<string, number>;
  failNext?: string;
}

// Visual novel scene structure
export interface Scene {
  name: string;
  setting: string;
  image_prompt?: string;
  dialogue: [string, string][];
  choices: SceneChoice[] | null;
}

// Generated act structure - the complete VN act data
// Legacy format kept for backward compatibility
export interface LegacyGeneratedAct {
  act: number;
  scenes: Scene[];
}

// New nested format for the generated act data with scene map
// Format option 1: { act1: { scene1: Scene, scene2: Scene, ... } }
// Format option 2 (simplified): { scene1: Scene, scene2: Scene, ... }
export type GeneratedAct =
  | LegacyGeneratedAct
  | Record<string, Record<string, Scene>> // Nested format with act wrapper
  | Record<string, Scene>; // Simplified direct scene map

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
  protagonist?: string; // Store the name of the main character for easy reference
  pathsData?: PathsData;
  plotData?: PlotData;
  generatedActs?: Record<string, any>; // Fixed GeneratedAct reference
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

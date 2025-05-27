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

// Character portraits data
export interface CharacterPortraitsData {
  [name: string]: string; // Maps character name to portrait URL
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
  arcsActivated?: string[];
  arcIntersections?: string[];
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
  setting: string;
  setting_desc?: string;
  dialogue: [string, string][];
  choices?: SceneChoice[] | null;
}

export type GeneratedAct =
   Record<string, Scene>; 

// Player data structure for tracking relationships, inventory, and skills
export interface PlayerData {
  relationships: Record<string, number>;
  inventory: Record<string, number>;
  skills: Record<string, number>;
  storyTitle?: string; // Title of the current story for display in the player navbar
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
  characterPortraitsData?: CharacterPortraitsData;
  pathsData?: PathsData;
  plotData?: PlotData;
  generatedActs?: Record<string, any>; // Fixed GeneratedAct reference
  playerData?: PlayerData;
  currentStep: number;
  lastSavedHash?: string; // Hash of the last saved state to detect unsaved changes
}

// Exported story structure
export interface VnStory {
  id: number;
  title: string;
  createdAt: string;
  actData: GeneratedAct;
  actNumber: number;
  characterPortraitData: CharacterPortraitsData,
}

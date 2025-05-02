// Project data types

// Basic form data
export interface BasicData {
  tone: string;
  genre: string;
  theme: string;
  setting: string;
}

// Concept form data
export interface ConceptData {
  title: string;
  tagline: string;
  premise: string;
}

// Character data
export interface Character {
  role: string;
  occupation: string;
  gender: string;
  age: string;
  appearance: string;
  personality: string;
  goals: string;
  relationshipPotential: string | null;
  conflict: string;
}

// Characters collection
export type CharactersData = Record<string, Character>;

// Path data
export interface Path {
  description: string;
  outcomes: string[];
  emotions: string[];
}

// Paths collection
export type PathsData = Record<string, Path>;

// Plot data
export interface PlotPoint {
  title: string;
  description: string;
}

// Plot collection
export interface PlotData {
  beginning: PlotPoint;
  middle: PlotPoint;
  climax: PlotPoint;
  ending: Record<string, PlotPoint>;
}

// Scene choice
export interface SceneChoice {
  id: string;
  text: string;
  nextSceneId: string;
  requirements?: Record<string, any>;
}

// Scene data
export interface Scene {
  id: string;
  background: string;
  backgroundGenerated?: boolean;
  characters: string[];
  narrator?: string;
  text: string;
  speaker?: string;
  showSpeaker?: boolean;
  choices?: SceneChoice[];
  auto_advance?: boolean;
}

// Generated Act
export interface GeneratedAct {
  [key: string]: Scene;
}

// Player data
export interface PlayerData {
  textSpeed: number;
  autoAdvance: boolean;
  seenScenes: Record<string, boolean>;
  variables: Record<string, any>;
  activeChoices: Record<string, string[]>;
}

// Complete Visual Novel Project Data
export interface VnProjectData {
  id?: number;
  title: string;
  basicData?: BasicData;
  conceptData?: ConceptData;
  charactersData?: CharactersData;
  protagonist?: string;
  pathsData?: PathsData;
  plotData?: PlotData;
  generatedActs?: Record<number, GeneratedAct>;
  playerData?: PlayerData;
  createdAt?: string;
  updatedAt?: string;
  currentStep: number;
}

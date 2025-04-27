import { apiRequest } from "./queryClient";

// Function to generate story concept
export async function generateConcept(
  basicData: {
    theme: string;
    tone: string;
    genre: string;
  },
  signal?: AbortSignal
): Promise<{
  title: string;
  tagline: string;
  premise: string;
}> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/concept",
      { basicData },
      signal
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating concept:", error);
    throw error;
  }
}

// Function to generate character details
export async function generateCharacter(
  index: number,
  partialCharacter: Partial<{
    name: string;
    role: string;
    gender: string;
    age: string;
  }>,
  projectContext: any,
  signal?: AbortSignal
): Promise<{
  name: string;
  role: string;
  gender: string;
  age: string;
  appearance: string;
  personality: string;
  goals: string;
  relationshipPotential: string;
  conflict: string;
}> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/character",
      { index, partialCharacter, projectContext },
      signal
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating character:", error);
    throw error;
  }
}

// Function to generate multiple characters at once
export async function generateMultipleCharacters(
  characterTemplates: Array<Partial<{
    name: string;
    role: string;
    gender: string;
    age: string;
  }>>,
  projectContext: any,
  signal?: AbortSignal
): Promise<{
  characters: Array<{
    name: string;
    role: string;
    gender: string;
    age: string;
    appearance: string;
    personality: string;
    goals: string;
    relationshipPotential: string;
    conflict: string;
  }>
} | Array<{
  name: string;
  role: string;
  gender: string;
  age: string;
  appearance: string;
  personality: string;
  goals: string;
  relationshipPotential: string;
  conflict: string;
}>> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/characters-bundle",
      { characterTemplates, projectContext },
      signal
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating multiple characters:", error);
    throw error;
  }
}

// Function to generate path details
export async function generatePath(
  index: number,
  partialPath: Partial<{
    title: string;
    loveInterest: string | null;
  }>,
  projectContext: any,
  signal?: AbortSignal
): Promise<{
  title: string;
  loveInterest: string | null;
  keyChoices: string[];
  beginning: string;
  middle: string;
  climax: string;
  goodEnding: string;
  badEnding: string;
}> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/path",
      { index, partialPath, projectContext },
      signal
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating path:", error);
    throw error;
  }
}

// Function to generate multiple paths at once
export async function generateMultiplePaths(
  pathTemplates: Array<Partial<{
    title: string;
    loveInterest: string | null;
  }>>,
  projectContext: any,
  signal?: AbortSignal
): Promise<{
  paths: Array<{
    title: string;
    loveInterest: string | null;
    keyChoices: string[];
    beginning: string;
    middle: string;
    climax: string;
    goodEnding: string;
    badEnding: string;
  }>
} | Array<{
  title: string;
  loveInterest: string | null;
  keyChoices: string[];
  beginning: string;
  middle: string;
  climax: string;
  goodEnding: string;
  badEnding: string;
}>> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/paths-bundle",
      { pathTemplates, projectContext },
      signal
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating multiple paths:", error);
    throw error;
  }
}

// Function to generate plot outline
export async function generatePlot(
  projectContext: any,
  signal?: AbortSignal
): Promise<{
  plotOutline: {
    act1: any;
    act2: any;
    act3: any;
    act4: any;
    act5: any;
  };
}> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/plot",
      { projectContext },
      signal
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating plot:", error);
    throw error;
  }
}

// Interface for generation result with error validation
interface GenerationResult<T> {
  data?: T;
  error?: string;
}

// Function to generate visual novel act
export async function generateAct(
  actNumber: number,
  scenesCount: number,
  projectContext: any,
  signal?: AbortSignal
): Promise<GenerationResult<{
  meta: {
    theme: string;
    relationshipVars: string[];
  };
  scenes: Array<{
    id: string;
    setting: string;
    bg?: string;
    dialogue: [string, string][];
    choices: Array<{
      id: string;
      text?: string;
      delta?: Record<string, number>;
      next: string;
      condition?: Record<string, number>;
      failNext?: string;
    }> | null;
  }>;
}>> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/act",
      { 
        actNumber, 
        scenesCount, 
        projectContext,
        validate: true // Add validation flag to check for inconsistencies
      },
      signal
    );
    
    const result = await response.json();
    
    // Check if the API returned an error
    if (result.error) {
      return { error: result.error };
    }
    
    return { data: result };
  } catch (error) {
    console.error(`Error generating act ${actNumber}:`, error);
    return { error: `Failed to generate Act ${actNumber}. Please try again.` };
  }
}

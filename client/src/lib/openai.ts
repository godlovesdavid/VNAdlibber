import { apiRequest } from "./queryClient";

// Interface for generation result with error validation
export interface GenerationResult<T> {
  data?: T;
  error?: string;
}

// Function to generate story concept
export async function generateConcept(
  basicData: {
    theme: string;
    tone: string;
    genre: string;
  },
  signal?: AbortSignal,
): Promise<
  GenerationResult<{
    title: string;
    tagline: string;
    premise: string;
  }>
> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/concept",
      { basicData },
      signal,
    );

    const result = await response.json();

    // Check if the API returned an error
    if (result.error) {
      return { error: result.error };
    }

    return { data: result };
  } catch (error) {
    console.error("Error generating concept:", error);
    return { error: "Failed to generate concept. Please try again." };
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
  signal?: AbortSignal,
): Promise<
  GenerationResult<{
    title: string;
    loveInterest: string | null;
    keyChoices: string[];
    beginning: string;
    middle: string;
    climax: string;
    goodEnding: string;
    badEnding: string;
  }>
> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/path",
      { index, partialPath, projectContext },
      signal,
    );

    const result = await response.json();

    // Check if the API returned an error
    if (result.error) {
      return { error: result.error };
    }

    return { data: result };
  } catch (error) {
    console.error("Error generating path:", error);
    return { error: "Failed to generate path. Please try again." };
  }
}

// Function to generate multiple paths at once
export async function generateMultiplePaths(
  pathTemplates: Array<
    Partial<{
      title: string;
      loveInterest: string | null;
    }>
  >,
  projectContext: any,
  signal?: AbortSignal,
): Promise<
  GenerationResult<
    | {
        paths: Array<{
          title: string;
          loveInterest: string | null;
          keyChoices: string[];
          beginning: string;
          middle: string;
          climax: string;
          goodEnding: string;
          badEnding: string;
        }>;
      }
    | Array<{
        title: string;
        loveInterest: string | null;
        keyChoices: string[];
        beginning: string;
        middle: string;
        climax: string;
        goodEnding: string;
        badEnding: string;
      }>
  >
> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/paths-bundle",
      { pathTemplates, projectContext },
      signal,
    );

    const result = await response.json();

    // Check if the API returned an error
    if (result.error) {
      return { error: result.error };
    }

    return { data: result };
  } catch (error) {
    console.error("Error generating multiple paths:", error);
    return { error: "Failed to generate paths. Please try again." };
  }
}

// Function to generate plot outline
export async function generatePlot(
  projectContext: any,
  signal?: AbortSignal,
): Promise<
  GenerationResult<{
    plotOutline: {
      act1: any;
      act2: any;
      act3: any;
      act4: any;
      act5: any;
    };
  }>
> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/plot",
      { projectContext },
      signal,
    );

    const result = await response.json();

    // Check if the API returned an error
    if (result.error) {
      return { error: result.error };
    }

    return { data: result };
  } catch (error) {
    console.error("Error generating plot:", error);
    return { error: "Failed to generate plot. Please try again." };
  }
}

// Interface for generation result with error validation
export interface GenerationResult<T> {
  data?: T;
  error?: string;
}

// Function to generate visual novel act
export async function generateAct(
  actNumber: number,
  scenesCount: number,
  projectContext: any,
  signal?: AbortSignal,
): Promise<
  GenerationResult<{
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
  }>
> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/generate/act",
      {
        actNumber,
        scenesCount,
        projectContext,
        validate: true, // Add validation flag to check for inconsistencies
      },
      signal,
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

import { apiRequest } from "./queryClient";

export interface GenerationResult<T> {
  data?: T;
  error?: string;
}

export async function generateConcept(
  params: { theme: string; tone: string; genre: string; setting?: string },
  signal?: AbortSignal,
): Promise<GenerationResult<any>> {
  const response = await apiRequest(
    "POST",
    "/api/generate/concept",
    { basicData: params },
    signal,
  );
  const data = await response.json();
  return { data };
}

export async function generatePlot(
  params: any,
  signal?: AbortSignal,
): Promise<GenerationResult<any>> {
  const response = await apiRequest(
    "POST",
    "/api/generate/plot",
    params,
    signal,
  );
  const data = await response.json();
  return { data };
}

export async function generateAct(
  params: any,
  signal?: AbortSignal,
): Promise<GenerationResult<any>> {
  const response = await apiRequest(
    "POST",
    "/api/generate/act",
    params,
    signal,
  );
  const data = await response.json();
  return { data };
}

export async function generateCharacter(
  characterTemplates: any[],
  projectContext: any,
  signal?: AbortSignal,
): Promise<GenerationResult<any>> {
  const response = await apiRequest(
    "POST",
    "/api/generate/character",
    { characterTemplates, projectContext },
    signal,
  );
  const data = await response.json();
  return { data };
}

export async function generatePath(
  pathTemplates: any[],
  projectContext: any,
  signal?: AbortSignal,
): Promise<GenerationResult<any>> {
  const response = await apiRequest(
    "POST",
    "/api/generate/path",
    { pathTemplates, projectContext },
    signal,
  );
  const data = await response.json();
  return { data };
}

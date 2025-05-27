import fetch from "node-fetch";
interface RunPodStatusResponse {
  status: string;
  output?: any; // Replace 'any' with a more specific type if possible
  error?: any; // Replace 'any' with a more specific type if possible
}
export async function generateSceneBackgroundImage(
  sceneId: string,
  setting_description: string,
): Promise<{ url: string }> {
  try {
    console.log("🎨 START: Generating image background for scene:", sceneId);
    // console.log("- setting_description:", { setting_description });

    if (!process.env.RUNPOD_API_KEY) {
      throw new Error("RUNPOD_API_KEY is required for image generation");
    }

    const prompt = generateBackgroundPrompt(setting_description);
    const width = 512;
    const height = 512;
    const guidance_scale = 7.5;
    const num_inference_steps = 20;

    const runpodEndpointId = process.env.RUNPOD_ENDPOINT_ID || "sdxl";
    const apiEndpoint = `https://api.runpod.ai/v2/${runpodEndpointId}/run`;

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          negative_prompt: "blurry, distorted, low quality, text, watermark",
          width: width,
          height: height,
          guidance_scale: guidance_scale,
          num_inference_steps: num_inference_steps,
          nsfw: false,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `RunPod API error: ${response.status} ${response.statusText}`,
      );
    }

    const initialData = (await response.json()) as { id: string };
    if (!initialData.id) {
      throw new Error("No job ID returned from RunPod");
    }

    const statusEndpoint = `https://api.runpod.ai/v2/${runpodEndpointId}/status/${initialData.id}`;
    const resultData = await pollForCompletion(
      statusEndpoint,
      process.env.RUNPOD_API_KEY,
    );

    if (Array.isArray(resultData) && resultData.length > 0) {
      const { image } = resultData[0];
      if (image && typeof image === "string") {
        const imageUrl = `data:image/png;base64,${image}`;
        return { url: imageUrl };
      }
    }

    throw new Error("No valid image data found in the RunPod response");
  } catch (error) {
    console.error("❌ Error generating image with RunPod:", error);
    throw error;
  }
}

async function pollForCompletion(
  statusEndpoint: string,
  apiKey: string,
  maxAttempts = 30,
) {
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const statusResponse = await fetch(statusEndpoint, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusResponse.ok) continue;

    const statusData = (await statusResponse.json()) as RunPodStatusResponse;
    if (statusData.status === "COMPLETED") {
      return statusData.output;
    } else if (statusData.status === "FAILED") {
      throw new Error(`RunPod job failed: ${JSON.stringify(statusData.error)}`);
    }
  }

  throw new Error(`Job did not complete after ${maxAttempts} polling attempts`);
}

function generateBackgroundPrompt(bg: string, theme?: string): string {
  return bg;
}

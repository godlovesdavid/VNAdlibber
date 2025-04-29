import fetch from "node-fetch";

// Generate a background image for a scene using RunPod's SDXL Endpoint
export async function generateSceneBackgroundImage(
  sceneId: string,
  bg: string,
  theme?: string,
): Promise<{ url: string }> {
  try {
    console.log("🎨 START: Generating image background for scene:", sceneId);
    console.log("- bg:", { bg, theme });
    console.log(
      "- RunPod API Key:",
      process.env.RUNPOD_API_KEY ? "Present (hidden)" : "MISSING",
    );

    // Make sure we have an API key
    if (!process.env.RUNPOD_API_KEY) {
      throw new Error("RUNPOD_API_KEY is required for image generation");
    }

    // Create a rich, detailed prompt for the image generation
    const prompt = generateBackgroundPrompt(bg, theme);
    console.log("- Generated prompt:", prompt);

    // Configure RunPod SDXL parameters
    const width = 512;
    const height = 512;
    const guidance_scale = 7.5; // How strictly to follow the prompt (higher = more faithful)
    const num_inference_steps = 20; // Number of diffusion steps (higher = more detail but slower)

    console.log(`- Using RunPod SDXL with resolution ${width}x${height}`);
    console.log(
      `- Parameters: guidance_scale=${guidance_scale}, steps=${num_inference_steps}`,
    );

    // RunPod AI API endpoint for SDXL
    // Note: This might need to be adjusted based on your specific RunPod endpoint ID
    const runpodEndpointId = process.env.RUNPOD_ENDPOINT_ID || "sdxl";
    const apiEndpoint = `https://api.runpod.ai/v2/${runpodEndpointId}/run`;

    // Make the API request to RunPod
    console.log("- Making RunPod API request...");
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          // negative_prompt: "blurry, distorted, low quality, text, watermark",
          // width: width,
          // height: height,
          // guidance_scale: guidance_scale,
          // num_inference_steps: num_inference_steps,
          // num_outputs: 1,
          // nsfw: false,
          // scheduler: "DPMSolverMultistep", // Faster scheduler
          // seed: Math.floor(Math.random() * 1000000), // Random seed
        },
      }),
    });

    console.log(`- RunPod response status: ${response.status}`);

    // Check for API errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error("- RunPod API error:", errorText);
      throw new Error(
        `RunPod API error: ${response.status} ${response.statusText}`,
      );
    }

    // Parse the initial response which will have a job ID
    const initialData = (await response.json()) as { id: string };
    console.log("- RunPod job initiated, ID:", initialData.id);

    if (!initialData.id) {
      throw new Error("No job ID returned from RunPod");
    }

    // Poll for the job completion
    const statusEndpoint = `https://api.runpod.ai/v2/${runpodEndpointId}/status/${initialData.id}`;
    let isCompleted = false;
    let resultData = null;
    let attempts = 0;
    const maxAttempts = 30; // Maximum number of polling attempts

    console.log("- Waiting for RunPod job completion...");

    // Poll until the job is completed or max attempts reached
    while (!isCompleted && attempts < maxAttempts) {
      attempts++;

      // Wait for 2 seconds between polling attempts
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check the job status
      const statusResponse = await fetch(statusEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`- Error checking job status: ${statusResponse.status}`);
        continue;
      }

      const statusData = (await statusResponse.json()) as {
        status: string;
        output?: any;
        error?: any;
      };
      console.log(`- Job status (attempt ${attempts}): ${statusData.status}`);

      if (statusData.status === "COMPLETED") {
        isCompleted = true;
        resultData = statusData.output;
        break;
      } else if (statusData.status === "FAILED") {
        throw new Error(
          `RunPod job failed: ${JSON.stringify(statusData.error)}`,
        );
      }
    }

    if (!isCompleted) {
      throw new Error(
        `RunPod job did not complete after ${maxAttempts} polling attempts`,
      );
    }

    console.log("- RunPod job completed successfully");

    const is_sdxl = false;

    if (is_sdxl) {
      // Define RunPod response structure types
      interface RunPodImageResult {
        images: Array<string | { base64?: string; image_url?: string }>;
      }

      // The result contains image data - typically URLs to the generated images
      if (
        resultData &&
        (resultData as RunPodImageResult).images &&
        (resultData as RunPodImageResult).images.length > 0
      ) {
        const images = (resultData as RunPodImageResult).images;

        // If RunPod returns image URLs directly as strings
        if (typeof images[0] === "string") {
          console.log("- Image URL found in response");
          return { url: images[0] as string };
        }
        // If RunPod returns base64-encoded images
        else if ((images[0] as { base64?: string }).base64) {
          const base64Image = (images[0] as { base64: string }).base64;
          const imageUrl = `data:image/png;base64,${base64Image}`;
          console.log("- Base64 image data found in response");
          return { url: imageUrl };
        }
        // If RunPod returns an object with an image_url property
        else if ((images[0] as { image_url?: string }).image_url) {
          console.log("- Image URL found in response object");
          return { url: (images[0] as { image_url: string }).image_url };
        }
      }
    } else {
      // Assume resultData is the parsed JSON response from the RunPod API
      if (Array.isArray(resultData) && resultData.length > 0) {
        const { image } = resultData[0];
        // Check if the image is a base64 string
        if (image && typeof image === "string") {
          console.log("- Base64 image data found in response");
          const imageUrl = `data:image/png;base64,${image}`;
          return { url: imageUrl };
        }
      }
    }

    // If we reached here, no valid image data was found
    console.error(
      "- No valid image data found in the RunPod response:",
      resultData,
    );
    throw new Error("No valid image data found in the RunPod response");
  } catch (error) {
    console.error("❌ Error generating image with RunPod:", error);
    throw error;
  }
}

// Helper function to create a detailed prompt for image generation
function generateBackgroundPrompt(bg: string, theme?: string): string {
  // Base prompt for visual novel backgrounds
  let prompt = `${bg}.`;

  // Add theme context if provided
  // if (theme) {
  //   prompt += ` The overall theme of the story is ${theme}.`;
  // }

  // Additional styling guidance for consistency and quality
  // prompt += ` The image should be rich in detail but without any text or characters. Create a cinematic, wide-angle view with atmospheric lighting and depth. The style should be anime-inspired but realistic in proportions and lighting. Make sure the scene has good composition with depth and a sense of place.`;

  return prompt;
}

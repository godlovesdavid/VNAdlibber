import fetch from "node-fetch";

// Generate a background image for a scene using Stability AI's SDXL model
export async function generateSceneBackgroundImage(
  sceneId: string,
  sceneSetting: string,
  theme?: string
): Promise<{ url: string }> {
  try {
    console.log("🎨 START: Generating image background for scene:", sceneId);
    console.log("- Settings:", { sceneSetting, theme });
    console.log("- Stability API Key:", process.env.STABILITY_API_KEY ? "Present (hidden)" : "MISSING");
    
    // Make sure we have an API key
    if (!process.env.STABILITY_API_KEY) {
      throw new Error("STABILITY_API_KEY is required for image generation");
    }
    
    // Create a rich, detailed prompt for the image generation
    const prompt = generateBackgroundPrompt(sceneSetting, theme);
    console.log("- Generated prompt:", prompt);
    
    // Configure Stability AI parameters
    const width = 512;
    const height = 512;
    const cfgScale = 7;   // How strictly to follow the prompt (higher = more faithful)
    const steps = 30;     // Number of diffusion steps (higher = more detail but slower)
    const engineId = "stable-diffusion-xl-1-0";  // SDXL model
    
    console.log(`- Using Stability AI SDXL with resolution ${width}x${height}`);
    console.log(`- Parameters: cfg_scale=${cfgScale}, steps=${steps}`);
    
    // Stability AI API endpoint for text-to-image generation
    const apiEndpoint = `https://api.stability.ai/v1/generation/${engineId}/text-to-image`;
    
    // Make the API request
    console.log("- Making Stability AI API request...");
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: prompt,
            weight: 1.0
          }
        ],
        cfg_scale: cfgScale,
        height: height,
        width: width,
        steps: steps,
        samples: 1,
      }),
    });
    
    console.log(`- Stability AI response status: ${response.status}`);
    
    // Check for API errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error("- Stability AI API error:", errorText);
      throw new Error(`Stability AI API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    console.log("- Stability AI API response received successfully");
    
    // The response contains base64-encoded images
    if (data && data.artifacts && data.artifacts.length > 0) {
      const base64Image = data.artifacts[0].base64;
      const imageUrl = `data:image/png;base64,${base64Image}`;
      
      console.log("- Image data found in response");
      return { url: imageUrl };
    } else {
      console.error("- No image data found in the Stability AI response");
      throw new Error("No image data found in the Stability AI response");
    }
  } catch (error) {
    console.error("❌ Error generating image with Stability AI:", error);
    throw error;
  }
}

// Helper function to create a detailed prompt for image generation
function generateBackgroundPrompt(setting: string, theme?: string): string {
  // Base prompt for visual novel backgrounds
  let prompt = `Create a beautiful, atmospheric background for a visual novel scene set in ${setting}.`;
  
  // Add theme context if provided
  if (theme) {
    prompt += ` The overall theme of the story is ${theme}.`;
  }
  
  // Additional styling guidance for consistency and quality
  prompt += ` The image should be rich in detail but without any text or characters. Create a cinematic, wide-angle view with atmospheric lighting and depth. The style should be anime-inspired but realistic in proportions and lighting. Make sure the scene has good composition with depth and a sense of place.`;
  
  return prompt;
}
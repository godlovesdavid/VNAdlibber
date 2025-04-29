import OpenAI from "openai";

// Initialize the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate a background image for a scene using DALL-E
export async function generateSceneBackgroundImage(
  sceneId: string,
  sceneSetting: string,
  theme?: string
): Promise<{ url: string }> {
  try {
    console.log("🎨 START: Generating image background for scene:", sceneId);
    console.log("- Settings:", { sceneSetting, theme });
    console.log("- OpenAI API Key:", process.env.OPENAI_API_KEY ? "Present (hidden)" : "MISSING");
    
    // Create a rich, detailed prompt for the image generation
    const prompt = generateBackgroundPrompt(sceneSetting, theme);
    console.log("- Generated prompt:", prompt);
    
    // Always use real DALL-E for this speed test
    process.env.FORCE_REAL_API = 'true';
    
    console.log("- Making OpenAI API request...");
    
    // Call the OpenAI API to generate the image
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    
    // TEMPORARY: Always use half resolution for speed testing
    // We'll use DALL-E 2 with 512x512 resolution for faster generation
    
    // For DALL-E 3, the available sizes are:
    // - 1024x1024
    // - 1024x1792
    // - 1792x1024
    
    // For DALL-E 2, the available sizes are:
    // - 256x256 (cheapest & fastest)
    // - 512x512 (good balance)
    // - 1024x1024 (highest quality)
    
    // Force smaller images for speed test
    const imageSize = "512x512";
    const imageQuality = "standard";
    const imageModel = "dall-e-2";
    
    console.log(`- Using DALL-E 2 with half resolution for speed testing`);
    console.log(`- Image size: ${imageSize}, quality: ${imageQuality}, model: ${imageModel}`);
    
    // Force DALL-E 2 with 512x512 resolution for speed testing
    const response = await openai.images.generate({
      model: "dall-e-2", // DALL-E 2 is faster than DALL-E 3
      prompt: prompt,
      n: 1, // Generate one image
      size: "512x512", // Smaller, faster images
      quality: "standard", // Standard quality (HD only available for DALL-E 3)
      style: "natural", // Natural style works best for backgrounds
    });
    
    console.log("- OpenAI API response received");
    
    // Extract and return the URL
    if (response.data && response.data[0]?.url) {
      console.log("- Image URL found in response (hidden for privacy)");
      return { url: response.data[0].url };
    } else {
      console.error("- No image URL found in the OpenAI response");
      throw new Error("No image URL found in the OpenAI response");
    }
  } catch (error) {
    console.error("❌ Error generating image with DALL-E:", error);
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
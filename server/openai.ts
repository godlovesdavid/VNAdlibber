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
    
    // Use a test image in development mode to avoid consuming the API quota
    // This also helps with faster iteration during development
    if (process.env.NODE_ENV === 'development' && !process.env.FORCE_REAL_API) {
      console.log("📸 DEV MODE: Using test image instead of calling OpenAI API");
      
      // Create an artificial delay to simulate API request time (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Using placeholder images from placeholder.com - much more reliable for testing
      // These are reliable test URLs that don't get blocked by CORS
      const testImages = [
        "https://via.placeholder.com/1024x768/3498db/ffffff?text=Mountain+Landscape", 
        "https://via.placeholder.com/1024x768/e74c3c/ffffff?text=Urban+Scene",    
        "https://via.placeholder.com/1024x768/2ecc71/ffffff?text=City+Plaza", 
        "https://via.placeholder.com/1024x768/9b59b6/ffffff?text=Castle"
      ];
      
      // Choose an image based on the scene ID or setting
      const imageIndex = Math.abs(sceneId.charCodeAt(0) + sceneId.charCodeAt(sceneId.length - 1)) % testImages.length;
      
      return { 
        url: testImages[imageIndex]
      };
    }
    
    console.log("- Making OpenAI API request...");
    
    // Call the OpenAI API to generate the image
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.images.generate({
      model: "dall-e-3", // Latest DALL-E model
      prompt: prompt,
      n: 1, // Generate one image
      size: "1024x1024", // Standard size
      quality: "standard", // Standard quality
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
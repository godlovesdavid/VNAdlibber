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
    
    // For testing, let's return a mock image URL to avoid hitting the API constantly
    // This will help debug the client-side image loading
    if (process.env.NODE_ENV === 'development') {
      console.log("DEV MODE: Returning mock image for testing");
      return { 
        url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxleHBsb3JlLWZlZWR8MXx8fGVufDB8fHx8&w=1000&q=80" 
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
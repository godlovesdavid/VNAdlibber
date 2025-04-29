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
      
      // Using direct colored backgrounds without text for reliability
      // These are plain solid-colored images that are guaranteed to work
      const testImages = [
        "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221024%22%20height%3D%22768%22%20viewBox%3D%220%200%201024%20768%22%20preserveAspectRatio%3D%22none%22%3E%3Cg%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%233498db%22%3E%3C%2Frect%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2248%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20fill%3D%22white%22%3EMountain%20Landscape%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fsvg%3E", 
        "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221024%22%20height%3D%22768%22%20viewBox%3D%220%200%201024%20768%22%20preserveAspectRatio%3D%22none%22%3E%3Cg%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23e74c3c%22%3E%3C%2Frect%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2248%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20fill%3D%22white%22%3EUrban%20Scene%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fsvg%3E",    
        "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221024%22%20height%3D%22768%22%20viewBox%3D%220%200%201024%20768%22%20preserveAspectRatio%3D%22none%22%3E%3Cg%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%232ecc71%22%3E%3C%2Frect%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2248%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20fill%3D%22white%22%3ECity%20Plaza%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fsvg%3E", 
        "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%221024%22%20height%3D%22768%22%20viewBox%3D%220%200%201024%20768%22%20preserveAspectRatio%3D%22none%22%3E%3Cg%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%239b59b6%22%3E%3C%2Frect%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-size%3D%2248%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20font-family%3D%22Arial%2C%20sans-serif%22%20fill%3D%22white%22%3ECastle%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fsvg%3E"
      ];
      
      // Choose a random image each time for better testing
      const imageIndex = Math.floor(Math.random() * testImages.length);
      
      return { 
        url: testImages[imageIndex]
      };
    }
    
    console.log("- Making OpenAI API request...");
    
    // Call the OpenAI API to generate the image
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    
    // Check if we should generate a smaller image (cost optimization mode)
    const useOptimizedSize = process.env.OPTIMIZE_DALL_E === 'true';
    
    // For DALL-E 3, the available sizes are:
    // - 1024x1024
    // - 1024x1792
    // - 1792x1024
    
    // For DALL-E 2, the available sizes are:
    // - 256x256 (cheaper)
    // - 512x512 
    // - 1024x1024
    
    // Choose image parameters based on optimization setting
    const imageSize = useOptimizedSize ? "512x512" : "1024x1024";
    const imageQuality = useOptimizedSize ? "standard" : "hd";
    const imageModel = useOptimizedSize ? "dall-e-2" : "dall-e-3";
    
    console.log(`- Using optimized DALL-E settings: ${useOptimizedSize ? 'YES' : 'NO'}`);
    console.log(`- Image size: ${imageSize}, quality: ${imageQuality}, model: ${imageModel}`);
    
    const response = await openai.images.generate({
      model: imageModel,
      prompt: prompt,
      n: 1, // Generate one image
      size: imageSize as "1024x1024" | "512x512" | "256x256", // Type assertion for TypeScript
      quality: imageQuality as "standard" | "hd", // Type assertion for TypeScript
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
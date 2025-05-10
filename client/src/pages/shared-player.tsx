import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Loader2 } from 'lucide-react';
import { VnPlayer } from '@/components/vn-player';
import { useToast } from '@/hooks/use-toast';
import { PlayerLayout } from '@/components/player-layout';
import { Button } from '@/components/ui/button';
import { NavBar } from '@/components/nav-bar';

interface SharedPlayerParams {
  shareId: string;
  storyTitle?: string;
  actString?: string; // Optional act-# string from URL
}

interface SharedStory {
  id: number;
  title: string;
  actData: any;
  actNumber: number;
  shareId: string;
  // Other properties can be added as needed
}

export default function SharedPlayer() {
  const { shareId, storyTitle, actString } = useParams<SharedPlayerParams>();
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<SharedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlActNumber, setUrlActNumber] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Extract act number from URL if available (format: "act-1", "act-2", etc.)
  useEffect(() => {
    if (actString && actString.startsWith('act-')) {
      const actNum = parseInt(actString.replace('act-', ''));
      if (!isNaN(actNum) && actNum > 0) {
        console.log("Found act number in URL:", actNum);
        setUrlActNumber(actNum);
      } else {
        console.log("Invalid act number format in URL:", actString);
      }
    } else {
      console.log("No act number in URL. Using default from story data.");
    }
  }, [actString]);

  // Set document title when story loads
  useEffect(() => {
    if (story?.title) {
      document.title = `${story.title} - Visual Novel Adventure`;
    }
  }, [story]);

  useEffect(() => {
    async function fetchSharedStory() {
      try {
        setLoading(true);
        
        // Call the API to get the shared story
        console.log("Fetching shared story with ID:", shareId);
        const response = await fetch(`/api/play/${shareId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Shared story not found');
          } else {
            setError('Failed to load the shared story');
          }
          return;
        }
        
        const data = await response.json();
        console.log("Received shared story data:", data);
        
        // Make sure the actData is valid and properly structured
        if (!data.story || !data.story.actData) {
          setError('The shared story data is incomplete or corrupted');
          return;
        }
        
        setStory(data.story);
      } catch (err) {
        console.error('Error fetching shared story:', err);
        setError('An error occurred while loading the shared story');
        toast({
          title: 'Error',
          description: 'Failed to load the shared story',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    if (shareId) {
      fetchSharedStory();
    }
  }, [shareId, toast]);

  const handleReturn = () => {
    // Return to home page
    window.location.href = '/';
  };

  if (loading) {
    return (
      <PlayerLayout
        title="Loading Story"
        description="Loading a shared visual novel adventure"
        showShareButtons={false}
      >
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="flex flex-col items-center justify-center mt-16">
            <Loader2 className="w-8 h-8 mr-2 animate-spin text-white" />
            <p className="mt-4 text-lg text-white">Loading shared story...</p>
          </div>
        </div>
      </PlayerLayout>
    );
  }

  if (error || !story) {
    return (
      <PlayerLayout
        title="Error"
        description="There was a problem loading the shared story"
        showShareButtons={false}
      >
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="flex flex-col items-center justify-center mt-16 max-w-md mx-auto">
            <div className="p-6 border border-gray-700 rounded-lg bg-black/80 text-white">
              <h2 className="mb-4 text-2xl font-bold text-center text-white">Error</h2>
              <p className="text-center text-gray-300">{error || 'Story not found'}</p>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 text-white rounded-md bg-primary hover:bg-primary/90"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </PlayerLayout>
    );
  }

  // Function to extract a description from the story data
  const getStoryDescription = () => {
    if (!story?.actData) return "An interactive visual novel adventure";
    
    // Try to extract a description from the first scene dialogue or summary
    try {
      // For nested format with scenes
      if (story.actData.scene1 && story.actData.scene1.dialogue && story.actData.scene1.dialogue.length > 0) {
        return story.actData.scene1.dialogue[0][1] || "An interactive visual novel adventure";
      }
      // For array format
      else if (story.actData.scenes && story.actData.scenes.length > 0) {
        const firstScene = story.actData.scenes[0];
        if (firstScene.dialogue && firstScene.dialogue.length > 0) {
          return firstScene.dialogue[0][1] || "An interactive visual novel adventure";
        }
      }
      return "An interactive visual novel adventure";
    } catch (err) {
      return "An interactive visual novel adventure";
    }
  };



  return (
    <PlayerLayout
      title={story.title}
      description={getStoryDescription()}
      showShareButtons={true}
    >
      {/* Debug info for the story data */}
      {process.env.NODE_ENV === 'development' && (
        <div className="hidden">
          Debug: Story ID: {story.id}, 
          Share ID: {story.shareId}, 
          Act Number: {story.actNumber}
        </div>
      )}
      
      <VnPlayer
        key={`shared-story-${story.id}-${story.shareId}`} // Add key to force component remount
        actData={story.actData}
        actNumber={
          // Priority order:
          // 1. Act number from URL (if available)
          // 2. Act number from story data
          // 3. Act number from actData.act
          // 4. Default to 1
          urlActNumber || 
          story.actNumber || 
          parseInt(story.actData?.act || "1")
        }
        onReturn={handleReturn}
        mode="imported"
        title={story.title}
      />
    </PlayerLayout>
  );
}

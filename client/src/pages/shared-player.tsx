import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Loader2 } from 'lucide-react';
import { VnPlayer } from '@/components/vn-player';
import { NavBar } from '@/components/nav-bar';
import { useToast } from '@/hooks/use-toast';

interface SharedPlayerParams {
  shareId: string;
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
  const { shareId } = useParams<SharedPlayerParams>();
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<SharedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSharedStory() {
      try {
        setLoading(true);
        
        // Call the API to get the shared story
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <NavBar />
        <div className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl mx-auto mt-16">
          <Loader2 className="w-8 h-8 mr-2 animate-spin" />
          <p className="mt-4 text-lg">Loading shared story...</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex flex-col items-center min-h-screen p-4">
        <NavBar />
        <div className="flex flex-col items-center justify-center flex-grow w-full max-w-4xl mx-auto mt-16">
          <div className="p-6 border rounded-lg shadow-md bg-card">
            <h2 className="mb-4 text-2xl font-bold text-center">Error</h2>
            <p className="text-center">{error || 'Story not found'}</p>
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
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex flex-col flex-grow">
        <div className="container px-2 py-4 mx-auto sm:px-4">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold">{story.title}</h1>
            <p className="text-sm text-muted-foreground">Shared Visual Novel</p>
          </div>
          
          <div className="flex-grow">
            <VnPlayer
              actData={story.actData}
              actNumber={story.actNumber}
              onReturn={handleReturn}
              mode="imported"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

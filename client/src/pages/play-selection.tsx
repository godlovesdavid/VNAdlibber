import { useState, useRef,useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Upload, Play, ArrowLeft, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeneratedAct } from "@/types/vn";
import { jsonrepair } from "jsonrepair";
import { useTranslation } from "react-i18next";

export default function PlaySelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { projectData } = useVnContext();
  const { t } = useTranslation();

  //return button
  useEffect(() => {
    const returnButtonHandler = () => {
        setLocation("/")
    }
    document.addEventListener("return", returnButtonHandler);
    return () => {
      document.removeEventListener("return", returnButtonHandler);
    };
  }, []);

  const [importedStories, setImportedStories] = useState<
    Array<{
      id: string;
      title: string;
      actNumber: number; // We ensure this is always a number in our code
      createdAt: string;
      actData: GeneratedAct;
    }>
  >(() => {
    // Initialize from localStorage on component mount
    try {
      const stored = localStorage.getItem("imported_stories");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error loading imported stories:", e);
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle import story
  const handleImportStory = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle removing imported story
  const handleRemoveImportedStory = (storyId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering play action

    // Filter out the story to remove
    const updatedStories = importedStories.filter(
      (story) => story.id !== storyId,
    );

    // Update state
    setImportedStories(updatedStories);

    // Update localStorage
    localStorage.setItem("imported_stories", JSON.stringify(updatedStories));

    toast({
      title: t('playSelection.storyRemoved', 'Story Removed'),
      description: t('playSelection.storyRemovedDesc', 'The imported story has been removed.'),
    });
  };

  // Process imported file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const actData = JSON.parse(jsonrepair(content)) as GeneratedAct;

        // Extract act number from filename if possible
        const filename = file.name;
        const actNumber = typeof actData.act === 'number' ? actData.act : 1;

        // Extract title from filename if possible
        let title = t('playSelection.defaultImportTitle', 'Imported Story');
        const titleMatch = filename.match(/^(.+?)(-Act[^.]+)?\./);
        if (titleMatch) 
          title = titleMatch[1].replace(/_/g, " ");

        // Add to imported stories
        const storyId = Date.now().toString();
        const updatedStories = [
          ...importedStories,
          {
            id: storyId,
            title,
            actNumber,
            createdAt: new Date().toISOString(),
            actData,
          },
        ];

        // Update state
        setImportedStories(updatedStories);

        // Also save to localStorage for persistence
        localStorage.setItem(
          "imported_stories",
          JSON.stringify(updatedStories),
        );

        toast({
          title: t('playSelection.storyImported', 'Story Imported'),
          description: t('playSelection.importSuccess', 'Successfully imported {{filename}}', { filename: file.name }),
        });

        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (error) {
        toast({
          title: t('playSelection.importFailed', 'Import Failed'),
          description: t('playSelection.invalidFormat', 'The file format is not valid. Please upload a valid story JSON file. Error details: {{error}}', 
            { error: error }),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle play story
  const handlePlayStory = (storyId: string) => {
    // For imported stories
    const story = importedStories.find((s) => s.id === storyId);
    if (story) {
      try {
        // Deep clone the story data to break any reference issues
        const storyToStore = {
          id: story.id,
          title: story.title,
          actNumber: story.actNumber,
          createdAt: story.createdAt,
          // Convert to string and back to ensure deep cloning
          actData: JSON.parse(JSON.stringify(story.actData)),
        };

        // Store the story in localStorage for persistence
        localStorage.setItem("imported_story", JSON.stringify(storyToStore));

        // Create an extra backup of the raw story data in case the Player has trouble parsing
        localStorage.setItem(
          "imported_story_backup",
          JSON.stringify(story.actData),
        );

        // Force a new component mount by adding a timestamp to the URL
        const timestamp = Date.now();
        localStorage.setItem("import_timestamp", timestamp.toString());
        setLocation(`/player/imported?t=${timestamp}`);
      } catch (error) {
        console.error("Error preparing story for import:", error);
        alert(
          "There was a problem preparing the story for playback. Please try again.",
        );
      }
      return;
    }

    // For generated acts from the current project
    const actNumber = parseInt(storyId);
    if (!isNaN(actNumber) && actNumber >= 1 && actNumber <= 5) {
      setLocation(`/player/${actNumber}`);
    }
  };

  // Get acts from current project
  const getCurrentProjectActs = () => {
    if (!projectData?.generatedActs) return [];

    return Object.keys(projectData.generatedActs)
      .map((key) => {
        const actNumber = parseInt(key.replace("act", ""));
        return {
          id: actNumber.toString(),
          title: projectData.title || "Untitled Project",
          actNumber,
          fullTitle: `${projectData.title || "Untitled Project"} - Act ${actNumber}`,
        };
      })
      .sort((a, b) => a.actNumber - b.actNumber);
  };

  // Back to main menu
  const handleBackToMenu = () => {
    setLocation("/");
  };

  return (
    <>
      <NavBar />

      <div className="pt-16">
        <div className="max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            {t('playSelection.title', 'Play Story')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('playSelection.subtitle', 'Select a visual novel to play or import a JSON file.')}
          </p>

          <div className="mb-6">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10 flex items-center"
              onClick={handleImportStory}
            >
              <Upload className="mr-2 h-4 w-4" /> {t('playSelection.importButton', 'Import Story File')}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Project Acts */}
            {getCurrentProjectActs().map((act) => (
              <Card key={act.id} className="overflow-hidden">
                <div className="h-32 bg-neutral-800 flex items-center justify-center">
                  <div className="text-white text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto h-12 w-12 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{act.title}</h3>
                  <p className="text-sm text-neutral-500 mb-3">
                    {t('playSelection.actLabel', 'Act {{number}}', { number: act.actNumber })}
                  </p>
                </CardContent>
                <CardFooter className="px-4 py-3 bg-gray-50 flex justify-between">
                  <span className="text-xs text-neutral-400">
                    {t('playSelection.fromCurrentProject', 'From Current Project')}
                  </span>
                  <Button size="sm" onClick={() => handlePlayStory(act.id)}>
                    <Play className="mr-1 h-3 w-3" /> {t('playSelection.playButton', 'Play')}
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {/* Imported Stories */}
            {importedStories.map((story) => (
              <Card key={story.id} className="overflow-hidden relative">
                {/* Delete button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full w-6 h-6 p-0 z-10 text-white hover:bg-red-600 hover:text-white"
                  onClick={(e) => handleRemoveImportedStory(story.id, e)}
                  title="Remove imported story"
                >
                  <X className="h-3 w-3" />
                </Button>

                <div className="h-32 bg-neutral-800 flex items-center justify-center">
                  <div className="text-white text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto h-12 w-12 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{story.title}</h3>
                  <p className="text-sm text-neutral-500 mb-3">
                    {t('playSelection.actImportedLabel', 'Act {{number}} • Imported', { number: story.actNumber })}
                  </p>
                </CardContent>
                <CardFooter className="px-4 py-3 bg-gray-50 flex justify-between">
                  <span className="text-xs text-neutral-400">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </span>
                  <Button size="sm" onClick={() => handlePlayStory(story.id)}>
                    <Play className="mr-1 h-3 w-3" /> {t('playSelection.playButton', 'Play')}
                  </Button>
                </CardFooter>
              </Card>
            ))}

            {/* Empty State */}
            {getCurrentProjectActs().length === 0 &&
              importedStories.length === 0 && (
                <Card className="overflow-hidden border-2 border-dashed border-neutral-300 flex items-center justify-center p-6 col-span-2">
                  <div className="text-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mx-auto h-12 w-12 text-neutral-400 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-neutral-500">
                      {t('playSelection.emptyStateMessage', 'Import a story file to play or generate acts from the Create Story menu')}
                    </p>
                  </div>
                </Card>
              )}
          </div>

          <div className="pt-6">
            <Button
              variant="outline"
              onClick={handleBackToMenu}
              className="flex items-center"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> {t('common.backToMainMenu', 'Back to Main Menu')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

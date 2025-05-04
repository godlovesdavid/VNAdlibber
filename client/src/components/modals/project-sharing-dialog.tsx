import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Share2, Copy, Twitter, Facebook, Mail, Link as LinkIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface ProjectSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Project {
  id: number;
  title: string;
  conceptData?: {
    title?: string;
    premise?: string;
  };
  generatedActs?: Record<string, any>;
}

interface ShareLink {
  shareId: string;
  storyId: number;
  title: string;
  url: string;
  actNumber: number;
}

export function ProjectSharingDialog({ open, onOpenChange }: ProjectSharingDialogProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all projects when the dialog opens
  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);
  
  async function fetchProjects() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const data = await response.json();
      console.log('Dialog opened, refreshing project list');
      setProjects(data.filter((p: Project) => p.generatedActs && Object.keys(p.generatedActs).length > 0));
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }
  
  async function selectProject(project: Project) {
    try {
      setLoadingProject(true);
      setSelectedProject(project);
      setShareLinks([]);
      setError(null);
      
      // Get details for selected project
      const response = await fetch(`/api/projects/${project.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }
      
      const fullProject = await response.json();
      const generatedActs = fullProject.generatedActs || {};
      
      // Create share links for each act
      if (Object.keys(generatedActs).length > 0) {
        const links: ShareLink[] = [];
        
        for (const [actKey, actData] of Object.entries(generatedActs)) {
          // Extract act number from key (e.g., "act1" -> 1)
          const actNumber = parseInt(actKey.replace('act', ''));
          if (isNaN(actNumber)) continue;
          
          try {
            // Generate share link for this act
            const shareResponse = await fetch('/api/share', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: project.id,
                actNumber,
                title: project.conceptData?.title || `${project.title} - Act ${actNumber}`,
                actData: actData // Pass the act data for newly generated acts
              })
            });
            
            if (!shareResponse.ok) {
              console.error(`Failed to create share link for act ${actNumber}`);
              continue;
            }
            
            const shareData = await shareResponse.json();
            links.push({
              ...shareData,
              actNumber
            });
          } catch (err) {
            console.error(`Error creating share link for act ${actNumber}:`, err);
          }
        }
        
        setShareLinks(links);
      } else {
        setError('No generated acts found for this project');
      }
    } catch (err) {
      console.error('Error selecting project:', err);
      setError('Failed to load project details');
    } finally {
      setLoadingProject(false);
    }
  }
  
  function handleCopyLink(url: string) {
    // Create the full URL
    const fullUrl = `${window.location.origin}${url}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(fullUrl)
      .then(() => {
        toast({
          title: 'Link copied',
          description: 'The share link has been copied to your clipboard',
        });
      })
      .catch(err => {
        console.error('Error copying link:', err);
        toast({
          title: 'Failed to copy',
          description: 'Could not copy the link to clipboard',
          variant: 'destructive',
        });
      });
  }
  
  function handleShare(platform: 'twitter' | 'facebook' | 'email', url: string, title: string) {
    const fullUrl = `${window.location.origin}${url}`;
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" - a visual novel created with VN Ad-libber!`)}&url=${encodeURIComponent(fullUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}&quote=${encodeURIComponent(`Check out "${title}" - a visual novel created with VN Ad-libber!`)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(`Check out this visual novel: ${title}`)}&body=${encodeURIComponent(`I've created a visual novel with VN Ad-libber and wanted to share it with you: ${fullUrl}`)}`;
        break;
    }
    
    window.open(shareUrl, '_blank');
  }
  
  function handleShareMultiple(platform: 'twitter' | 'facebook' | 'email') {
    if (!selectedProject || shareLinks.length === 0) return;
    
    const projectTitle = selectedProject.conceptData?.title || selectedProject.title;
    let message = `Check out my visual novel series "${projectTitle}"! Read all acts here:\n\n`;
    
    shareLinks.forEach((link, index) => {
      const fullUrl = `${window.location.origin}${link.url}`;
      message += `Act ${link.actNumber}: ${fullUrl}\n`;
    });
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        // Twitter has character limits, so we'll just share the first act with a note
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I've created a visual novel series "${projectTitle}" with VN Ad-libber! Read Act 1 here, and check my profile for more acts:`)}&url=${encodeURIComponent(`${window.location.origin}${shareLinks[0].url}`)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}${shareLinks[0].url}`)}&quote=${encodeURIComponent(`I've created a visual novel series "${projectTitle}" with VN Ad-libber! Multiple acts available.`)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(`Check out my visual novel series: ${projectTitle}`)}&body=${encodeURIComponent(message)}`;
        break;
    }
    
    window.open(shareUrl, '_blank');
  }
  
  // Render content based on selected state
  function renderContent() {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p>Loading projects...</p>
        </div>
      );
    }
    
    if (error && !selectedProject) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchProjects}>Retry</Button>
        </div>
      );
    }
    
    if (projects.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="mb-4">No projects with generated acts found</p>
          <p className="text-sm text-muted-foreground">Create a project and generate acts to share them</p>
        </div>
      );
    }
    
    if (!selectedProject) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto py-2">
          {projects.map(project => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectProject(project)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{project.conceptData?.title || project.title}</CardTitle>
                {project.conceptData?.premise && (
                  <CardDescription className="line-clamp-2">{project.conceptData.premise}</CardDescription>
                )}
              </CardHeader>
              <CardFooter className="pt-2">
                <div className="text-xs text-muted-foreground">
                  {project.generatedActs && Object.keys(project.generatedActs).length} Acts
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{selectedProject.conceptData?.title || selectedProject.title}</h3>
            {selectedProject.conceptData?.premise && (
              <p className="text-sm text-muted-foreground line-clamp-1">{selectedProject.conceptData.premise}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedProject(null)}>
            Back to Projects
          </Button>
        </div>
        
        {loadingProject ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-red-500 mb-2">{error}</p>
            <Button size="sm" onClick={() => selectProject(selectedProject)}>Retry</Button>
          </div>
        ) : shareLinks.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Share Entire Series</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleShareMultiple('twitter')}>
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleShareMultiple('facebook')}>
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleShareMultiple('email')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Share Individual Acts</h4>
              <div className="space-y-3 max-h-[40vh] overflow-y-auto py-1">
                {shareLinks.map((link) => (
                  <Card key={link.shareId} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md">{link.title}</CardTitle>
                      <CardDescription className="flex items-center text-xs">
                        <LinkIcon className="h-3 w-3 mr-1" />
                        <span className="truncate w-48 md:w-80">{window.location.origin}{link.url}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex gap-2 flex-wrap">
                      <Button variant="secondary" size="sm" onClick={() => handleCopyLink(link.url)}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShare('twitter', link.url, link.title)}>
                        <Twitter className="h-3 w-3 mr-1" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShare('facebook', link.url, link.title)}>
                        <Facebook className="h-3 w-3 mr-1" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShare('email', link.url, link.title)}>
                        <Mail className="h-3 w-3 mr-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <p>No share links available for this project</p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Your Visual Novels</DialogTitle>
          <DialogDescription>
            Select a project to share individual acts or the entire series with others.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

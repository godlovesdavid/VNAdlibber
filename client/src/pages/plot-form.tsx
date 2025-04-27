import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useVnContext } from "@/context/vn-context";
import { useVnData } from "@/hooks/use-vn-data";
import { CreationProgress } from "@/components/creation-progress";
import { NavBar } from "@/components/nav-bar";
import { Button } from "@/components/ui/button";
import { Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { PlotAct } from "@/types/vn";

export default function PlotForm() {
  const [, setLocation] = useLocation();
  const { projectData, setPlotData, goToStep } = useVnContext();
  const { generatePlotData, isGenerating, cancelGeneration } = useVnData();
  
  // Plot state
  const [plotOutline, setPlotOutline] = useState<{
    act1: PlotAct;
    act2: PlotAct;
    act3: PlotAct;
    act4: PlotAct;
    act5: PlotAct;
  } | null>(null);
  
  // Track expanded acts
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>({
    act1: false,
    act2: false,
    act3: false,
    act4: false,
    act5: false
  });
  
  // Load existing data if available
  useEffect(() => {
    if (projectData?.plotData?.plotOutline) {
      setPlotOutline(projectData.plotData.plotOutline);
      
      // Expand the first act by default if we have data
      setExpandedActs({
        ...expandedActs,
        act1: true
      });
    }
  }, [projectData]);
  
  // Toggle act expansion
  const toggleAct = (act: string) => {
    setExpandedActs({
      ...expandedActs,
      [act]: !expandedActs[act]
    });
  };
  
  // Generate plot outline using AI
  const handleGeneratePlot = async () => {
    const generatedPlot = await generatePlotData();
    
    if (generatedPlot && generatedPlot.plotOutline) {
      setPlotOutline(generatedPlot.plotOutline);
      
      // Expand the first act after generation
      setExpandedActs({
        ...expandedActs,
        act1: true
      });
      
      // Log generation to console
      console.log("Generated plot outline:", generatedPlot);
    }
  };
  
  // Go back to previous step
  const handleBack = () => {
    goToStep(4);
  };
  
  // Proceed to next step
  const handleNext = () => {
    // Validate that we have plot outline
    if (!plotOutline) {
      alert("Please generate a plot outline before proceeding");
      return;
    }
    
    // Save data
    setPlotData({
      plotOutline
    });
    
    // Navigate to next step
    setLocation("/create/generate-vn");
  };
  
  return (
    <>
      <NavBar />
      <CreationProgress currentStep={5} />
      
      <div className="pt-16">
        <div className="creation-container max-w-4xl mx-auto p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Step 5: Plot Outline</h2>
          <p className="text-gray-600 mb-6">Generate a master plot outline that weaves together all your created elements into a cohesive story structure.</p>
          
          <div className="bg-white rounded-lg p-5 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">AI-Generated Plot Outline</h3>
              <Button
                onClick={handleGeneratePlot}
                className="flex items-center"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-1 h-4 w-4" /> Generate Plot
                  </>
                )}
              </Button>
            </div>
            
            {isGenerating && (
              <div className="flex items-center text-primary-600 mb-4">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating your plot outline... This may take a moment.</span>
              </div>
            )}
            
            {plotOutline ? (
              <div className="space-y-3">
                {/* Act 1 */}
                <div className="border border-neutral-200 rounded-md overflow-hidden">
                  <div 
                    className="bg-neutral-50 px-4 py-3 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleAct('act1')}
                  >
                    <h4 className="font-medium">Act 1: Introduction</h4>
                    {expandedActs.act1 ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                  {expandedActs.act1 && (
                    <div className="px-4 py-3">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Title</h5>
                          <p className="text-neutral-600">{plotOutline.act1.title}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Summary</h5>
                          <p className="text-neutral-600">{plotOutline.act1.summary}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Events</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act1.events.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arcs Activated</h5>
                          <p className="text-neutral-600">{plotOutline.act1.arcsActivated.join(', ')}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arc Intersections</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act1.arcIntersections.map((intersection, index) => (
                              <li key={index}>{intersection}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Player Choices</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act1.playerChoices.map((choice, index) => (
                              <li key={index}>{choice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Act 2 */}
                <div className="border border-neutral-200 rounded-md overflow-hidden">
                  <div 
                    className="bg-neutral-50 px-4 py-3 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleAct('act2')}
                  >
                    <h4 className="font-medium">Act 2: Rising Action</h4>
                    {expandedActs.act2 ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                  {expandedActs.act2 && (
                    <div className="px-4 py-3">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Title</h5>
                          <p className="text-neutral-600">{plotOutline.act2.title}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Summary</h5>
                          <p className="text-neutral-600">{plotOutline.act2.summary}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Events</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act2.events.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arcs Activated</h5>
                          <p className="text-neutral-600">{plotOutline.act2.arcsActivated.join(', ')}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arc Intersections</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act2.arcIntersections.map((intersection, index) => (
                              <li key={index}>{intersection}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Player Choices</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act2.playerChoices.map((choice, index) => (
                              <li key={index}>{choice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Act 3 */}
                <div className="border border-neutral-200 rounded-md overflow-hidden">
                  <div 
                    className="bg-neutral-50 px-4 py-3 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleAct('act3')}
                  >
                    <h4 className="font-medium">Act 3: Midpoint Twist</h4>
                    {expandedActs.act3 ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                  {expandedActs.act3 && (
                    <div className="px-4 py-3">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Title</h5>
                          <p className="text-neutral-600">{plotOutline.act3.title}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Summary</h5>
                          <p className="text-neutral-600">{plotOutline.act3.summary}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Events</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act3.events.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arcs Activated</h5>
                          <p className="text-neutral-600">{plotOutline.act3.arcsActivated.join(', ')}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arc Intersections</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act3.arcIntersections.map((intersection, index) => (
                              <li key={index}>{intersection}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Player Choices</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act3.playerChoices.map((choice, index) => (
                              <li key={index}>{choice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Act 4 */}
                <div className="border border-neutral-200 rounded-md overflow-hidden">
                  <div 
                    className="bg-neutral-50 px-4 py-3 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleAct('act4')}
                  >
                    <h4 className="font-medium">Act 4: Escalating Conflicts</h4>
                    {expandedActs.act4 ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                  {expandedActs.act4 && (
                    <div className="px-4 py-3">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Title</h5>
                          <p className="text-neutral-600">{plotOutline.act4.title}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Summary</h5>
                          <p className="text-neutral-600">{plotOutline.act4.summary}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Events</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act4.events.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arcs Activated</h5>
                          <p className="text-neutral-600">{plotOutline.act4.arcsActivated.join(', ')}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arc Intersections</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act4.arcIntersections.map((intersection, index) => (
                              <li key={index}>{intersection}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Player Choices</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act4.playerChoices.map((choice, index) => (
                              <li key={index}>{choice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Act 5 */}
                <div className="border border-neutral-200 rounded-md overflow-hidden">
                  <div 
                    className="bg-neutral-50 px-4 py-3 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleAct('act5')}
                  >
                    <h4 className="font-medium">Act 5: Resolution/Endings</h4>
                    {expandedActs.act5 ? (
                      <ChevronUp className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                  {expandedActs.act5 && (
                    <div className="px-4 py-3">
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Title</h5>
                          <p className="text-neutral-600">{plotOutline.act5.title}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Summary</h5>
                          <p className="text-neutral-600">{plotOutline.act5.summary}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Events</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act5.events.map((event, index) => (
                              <li key={index}>{event}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arcs Activated</h5>
                          <p className="text-neutral-600">{plotOutline.act5.arcsActivated.join(', ')}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Arc Intersections</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act5.arcIntersections.map((intersection, index) => (
                              <li key={index}>{intersection}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-neutral-700">Player Choices</h5>
                          <ul className="list-disc list-inside text-neutral-600 pl-2">
                            {plotOutline.act5.playerChoices.map((choice, index) => (
                              <li key={index}>{choice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-neutral-500">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="mx-auto h-12 w-12 text-neutral-300 mb-3" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                <p>Click "Generate Plot" to create your story outline</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={cancelGeneration}
                >
                  Cancel Generation
                </Button>
              </div>
            )}
          </div>
          
          <div className="pt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              Back
            </Button>
            <Button onClick={handleNext}>
              Next: Generate VN
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VnProvider } from "@/context/vn-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import BasicForm from "@/pages/basic-form";
import ConceptForm from "@/pages/concept-form";
import CharactersForm from "@/pages/characters-form";
import PathsForm from "@/pages/paths-form";
import PlotForm from "@/pages/plot-form";
import GenerateVnForm from "@/pages/generate-vn-form";
import PlaySelection from "@/pages/play-selection";
import Player from "@/pages/player";
import TestPlayer from "@/pages/test-player";
import SharedPlayer from "@/pages/shared-player";
import TranslationSettingsPage from "@/pages/translation-settings";
import TranslationManagerPage from "@/pages/translation-manager-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create/basic" component={BasicForm} />
      <Route path="/create/concept" component={ConceptForm} />
      <Route path="/create/characters" component={CharactersForm} />
      <Route path="/create/paths" component={PathsForm} />
      <Route path="/create/plot" component={PlotForm} />
      <Route path="/create/generate-vn" component={GenerateVnForm} />
      <Route path="/play" component={PlaySelection} />
      <Route path="/player/:actId" component={Player} />
      {/* Support both URL formats for backward compatibility */}
      <Route path="/play/:shareId/:storyTitle?" component={SharedPlayer} />
      <Route path="/play/:shareId/:actString/:storyTitle?" component={SharedPlayer} />
      <Route path="/test-player" component={TestPlayer} />
      <Route path="/settings/translations" component={TranslationSettingsPage} />
      <Route path="/tools/translation-manager" component={TranslationManagerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VnProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </VnProvider>
    </QueryClientProvider>
  );
}

export default App;

import { ApiKeyForm } from "@/components/api-key-form";
import { NavBar } from "@/components/nav-bar";

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Settings</h1>
        
        <div className="grid gap-8 max-w-4xl mx-auto">
          <section>
            <h2 className="text-xl font-semibold mb-4">API Settings</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">AI Service Keys</h3>
                <p className="text-muted-foreground mb-4">
                  To use the AI generation features, you'll need to provide your own API keys.
                  These keys are stored locally on your device and are never sent to our servers
                  except when making AI requests.
                </p>
              </div>
              <ApiKeyForm />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
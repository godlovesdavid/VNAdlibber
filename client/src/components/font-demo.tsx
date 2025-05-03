import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function FontDemo() {
  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-title font-bold mb-6 text-center">Font Showcase</h1>
      <p className="text-center mb-10 text-muted-foreground">
        Review the different font options available in the application
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Inter - Default Sans Font */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-3">Inter (Default Sans)</h2>
          <Separator className="mb-4" />
          <p className="font-sans text-sm mb-2">Small text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-sans text-base mb-2">Base text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-sans text-lg mb-2">Large text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-sans text-xl font-bold mb-2">Bold text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-sans text-base italic">Italic text: The quick brown fox jumps over the lazy dog.</p>
        </Card>

        {/* Playfair Display - Title Font */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-3">Playfair Display (Title)</h2>
          <Separator className="mb-4" />
          <p className="font-title text-sm mb-2">Small text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-title text-base mb-2">Base text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-title text-lg mb-2">Large text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-title text-xl font-bold mb-2">Bold text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-title text-base italic">Italic text: The quick brown fox jumps over the lazy dog.</p>
        </Card>

        {/* Quicksand - Visual Novel Font */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-3">Quicksand (Visual Novel)</h2>
          <Separator className="mb-4" />
          <p className="font-vn text-sm mb-2">Small text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-vn text-base mb-2">Base text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-vn text-lg mb-2">Large text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-vn text-xl font-bold mb-2">Bold text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-vn text-base italic">Italic text: The quick brown fox jumps over the lazy dog.</p>
        </Card>

        {/* Lora - Dialogue Font */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-3">Lora (Dialogue)</h2>
          <Separator className="mb-4" />
          <p className="font-dialogue text-sm mb-2">Small text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-dialogue text-base mb-2">Base text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-dialogue text-lg mb-2">Large text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-dialogue text-xl font-bold mb-2">Bold text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-dialogue text-base italic">Italic text: The quick brown fox jumps over the lazy dog.</p>
        </Card>

        {/* JetBrains Mono - Mono Font */}
        <Card className="p-6 md:col-span-2">
          <h2 className="text-xl font-bold mb-3">JetBrains Mono (Monospace)</h2>
          <Separator className="mb-4" />
          <p className="font-mono text-sm mb-2">Small text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-mono text-base mb-2">Base text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-mono text-lg mb-2">Large text: The quick brown fox jumps over the lazy dog.</p>
          <p className="font-mono text-xl font-bold mb-2">Bold text: The quick brown fox jumps over the lazy dog.</p>
          <div className="bg-neutral-50 p-4 rounded-md">
            <pre className="font-mono text-sm">
              {`const sampleCode = () => {
  console.log("This is a code example");
  return true;
};`}
            </pre>
          </div>
        </Card>
      </div>

      <div className="mt-10">
        <h3 className="text-xl font-bold mb-3">Font Combinations</h3>
        <Separator className="mb-6" />
        <div className="grid gap-6">
          <Card className="p-6">
            <h4 className="font-title text-2xl mb-3">Title + Body Combination</h4>
            <p className="font-sans mb-4">This is a paragraph in Inter (default sans) font that follows a Playfair Display heading. This combination works well for formal or sophisticated interfaces.</p>
            <div className="bg-primary/10 p-4 rounded-md">
              <h5 className="font-title text-lg mb-2">Playfair Display</h5>
              <p className="font-sans">Inter (default sans)</p>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-vn text-2xl mb-3">Visual Novel Style</h4>
            <div className="bg-neutral-900 text-white p-4 rounded-md mb-4">
              <p className="font-dialogue italic mb-2">"Do you really think this is a good idea?" Sarah asked.</p>
              <p className="font-dialogue mb-2">I paused, unsure of how to respond. The gravity of the situation weighed heavily on my shoulders.</p>
              <div className="flex justify-end space-x-2 mt-4">
                <div className="bg-primary/20 text-primary-foreground px-3 py-1 rounded font-vn">
                  "It's our only option."</div>
                <div className="bg-primary/20 text-primary-foreground px-3 py-1 rounded font-vn">
                  "Maybe we should reconsider."</div>
              </div>
            </div>
            <div className="bg-primary/10 p-4 rounded-md">
              <h5 className="font-vn text-lg mb-2">Quicksand (UI elements)</h5>
              <p className="font-dialogue">Lora (dialogue text)</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

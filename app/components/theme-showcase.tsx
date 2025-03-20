import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { useTheme } from '~/hooks/use-theme';

export function ThemeShowcase() {
  const { isDarkMode } = useTheme();
  
  return (
    <div className="container mx-auto py-12 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Food on the Stove Theme Showcase</h1>
        <p className="text-muted-foreground">
          Currently viewing in {isDarkMode ? 'dark' : 'light'} mode
        </p>
      </div>
      
      {/* Color Palette */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Color Palette</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Primary Colors */}
          <div className="space-y-2">
            <h3 className="font-medium">Primary (Flame Red)</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="h-12 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
                Primary
              </div>
              <div className="grid grid-cols-5 gap-1">
                <div className="h-8 bg-primary-50 rounded-md"></div>
                <div className="h-8 bg-primary-200 rounded-md"></div>
                <div className="h-8 bg-primary-400 rounded-md"></div>
                <div className="h-8 bg-primary-600 rounded-md"></div>
                <div className="h-8 bg-primary-800 rounded-md"></div>
              </div>
            </div>
          </div>
          
          {/* Secondary Colors */}
          <div className="space-y-2">
            <h3 className="font-medium">Secondary (Charcoal)</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="h-12 bg-secondary rounded-md flex items-center justify-center text-secondary-foreground">
                Secondary
              </div>
              <div className="grid grid-cols-5 gap-1">
                <div className="h-8 bg-secondary-50 rounded-md"></div>
                <div className="h-8 bg-secondary-200 rounded-md"></div>
                <div className="h-8 bg-secondary-400 rounded-md"></div>
                <div className="h-8 bg-secondary-600 rounded-md"></div>
                <div className="h-8 bg-secondary-800 rounded-md"></div>
              </div>
            </div>
          </div>
          
          {/* Background & Foreground */}
          <div className="space-y-2">
            <h3 className="font-medium">Background & Foreground</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="h-12 bg-background border border-border rounded-md flex items-center justify-center text-foreground">
                Background
              </div>
              <div className="h-12 bg-foreground rounded-md flex items-center justify-center text-background">
                Foreground
              </div>
            </div>
          </div>
          
          {/* Accent & Muted */}
          <div className="space-y-2">
            <h3 className="font-medium">Accent & Muted</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="h-12 bg-accent rounded-md flex items-center justify-center text-accent-foreground">
                Accent
              </div>
              <div className="h-12 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                Muted
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Separator />
      
      {/* Brand Colors */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Brand Colors</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 bg-fots-red rounded-md flex items-center justify-center text-white font-medium">
            Flame Red
          </div>
          <div className="h-24 bg-fots-charcoal rounded-md flex items-center justify-center text-white font-medium">
            Charcoal
          </div>
          <div className="h-24 bg-fots-lightGray rounded-md flex items-center justify-center text-fots-charcoal font-medium">
            Light Gray
          </div>
          <div className="h-24 bg-fots-darkGray rounded-md flex items-center justify-center text-white font-medium">
            Dark Gray
          </div>
        </div>
      </section>
      
      <Separator />
      
      {/* Buttons */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>
      
      <Separator />
      
      {/* Cards */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Standard Card */}
          <Card>
            <CardHeader>
              <CardTitle>Standard Card</CardTitle>
              <CardDescription>A basic card component</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is a standard card using the default card styling.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
          
          {/* Primary Card */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Featured Card</h3>
              <p className="text-sm text-foreground/80">A card with primary color accents</p>
              <div className="mt-4">
                <p>This card uses the primary color with reduced opacity for emphasis.</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm">Learn More</Button>
              </div>
            </div>
          </div>
          
          {/* Secondary Card */}
          <div className="bg-secondary text-secondary-foreground rounded-lg overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Secondary Card</h3>
              <p className="text-sm opacity-80">A card with secondary background</p>
              <div className="mt-4">
                <p>This card uses the secondary color as its background.</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" className="bg-secondary-foreground/10 text-secondary-foreground border-secondary-foreground/20">
                  Action
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Separator />
      
      {/* Typography */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Typography</h2>
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <p className="text-sm text-muted-foreground">text-4xl font-bold</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">Heading 2</h2>
            <p className="text-sm text-muted-foreground">text-3xl font-semibold</p>
          </div>
          <div>
            <h3 className="text-2xl font-medium">Heading 3</h3>
            <p className="text-sm text-muted-foreground">text-2xl font-medium</p>
          </div>
          <div>
            <h4 className="text-xl font-medium">Heading 4</h4>
            <p className="text-sm text-muted-foreground">text-xl font-medium</p>
          </div>
          <div>
            <p className="text-base">Body text - The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">text-base</p>
          </div>
          <div>
            <p className="text-sm">Small text - The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">text-sm</p>
          </div>
          <div>
            <p className="text-muted-foreground">Muted text - The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">text-muted-foreground</p>
          </div>
          <div>
            <p className="text-primary">Primary text - The quick brown fox jumps over the lazy dog.</p>
            <p className="text-sm text-muted-foreground">text-primary</p>
          </div>
        </div>
      </section>
    </div>
  );
}

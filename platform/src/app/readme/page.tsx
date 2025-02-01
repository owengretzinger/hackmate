"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Code,
  Download,
  Copy,
  Check,
} from "lucide-react";
import Mermaid from "~/components/mermaid";
import { cn } from "~/lib/utils";

const formSchema = z.object({
  repoUrl: z.string().url("Please enter a valid URL"),
});

type ViewMode = "preview" | "code";

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const ToggleButton = ({ active, onClick, icon, children }: ToggleButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={cn(
      "flex h-8 items-center gap-2 px-3 text-sm font-medium transition-colors",
      active
        ? "bg-background text-foreground shadow-sm hover:bg-background"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {icon}
    {children}
  </Button>
);

interface ViewModeToggleProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const ViewModeToggle = ({ viewMode, setViewMode }: ViewModeToggleProps) => (
  <div className="inline-flex items-center rounded-lg bg-secondary p-1">
    <ToggleButton
      active={viewMode === "preview"}
      onClick={() => setViewMode("preview")}
      icon={<Eye className="h-4 w-4" />}
    >
      Preview
    </ToggleButton>
    <ToggleButton
      active={viewMode === "code"}
      onClick={() => setViewMode("code")}
      icon={<Code className="h-4 w-4" />}
    >
      Code
    </ToggleButton>
  </div>
);

interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
}

const ActionButton = ({ onClick, icon }: ActionButtonProps) => (
  <Button
    variant="outline"
    size="icon"
    onClick={onClick}
    className="h-10 w-10"
  >
    {icon}
  </Button>
);

interface UrlFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
}

const UrlForm = ({ onSubmit, isLoading }: UrlFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repoUrl: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="repoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repository URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://github.com/user/repo"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate README"}
        </Button>
      </form>
    </Form>
  );
};

export default function ReadmePage() {
  const [generatedReadme, setGeneratedReadme] = useState<string | null>(null);
  const [generatedDiagram, setGeneratedDiagram] = useState<string | null>(null);
  const [repomixOutput, setRepomixOutput] = useState<string | null>(null);
  const [showRepomixOutput, setShowRepomixOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const generateReadme = api.readme.generateReadme.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error,
        });
        setGeneratedReadme(null);
        setGeneratedDiagram(null);
        setRepomixOutput(null);
      } else {
        toast({
          description: "README generated successfully!",
        });
        setGeneratedReadme(data.readme);
        setGeneratedDiagram(data.diagram);
        setRepomixOutput(data.repomixOutput);
      }
      setIsLoading(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to server. Please try again.",
      });
      setIsLoading(false);
      setGeneratedReadme(null);
      setGeneratedDiagram(null);
      setRepomixOutput(null);
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setGeneratedReadme(null);
    setGeneratedDiagram(null);
    setRepomixOutput(null);
    setShowRepomixOutput(false);
    await generateReadme.mutateAsync(values);
  };

  const handleCopyCode = async () => {
    if (!generatedDiagram) return;
    await navigator.clipboard.writeText(generatedDiagram);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadSvgAsPng = () => {
    // Get the rendered SVG from the Mermaid component
    const svgElement = document.querySelector('.mermaid svg');
    if (!(svgElement instanceof SVGSVGElement)) return;

    try {
      // Create canvas with proper dimensions
      const canvas = document.createElement('canvas');
      const scale = 4;

      // Set canvas size based on SVG's bounding box
      const bbox = svgElement.getBBox();
      const transform = svgElement.getScreenCTM();
      if (!transform) return;

      // Calculate actual dimensions
      const width = Math.ceil(bbox.width * transform.a);
      const height = Math.ceil(bbox.height * transform.d);
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      
      img.onload = () => {
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw scaled image
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        // Download
        const a = document.createElement('a');
        a.download = 'architecture-diagram.png';
        a.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error generating PNG:', error);
    }
  };

  return (
    <>
      <div className="container mx-auto py-10">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>README Generator</CardTitle>
            <CardDescription>
              Enter a public GitHub repository URL to generate a README file and
              architecture diagram using AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UrlForm onSubmit={handleSubmit} isLoading={isLoading} />

            {(generatedReadme ?? generatedDiagram) && (
              <div className="mt-8 space-y-8">
                {generatedDiagram && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">
                        Architecture Diagram
                      </h3>
                      <div className="flex items-center gap-2">
                        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
                        <ActionButton
                          onClick={viewMode === "preview" ? downloadSvgAsPng : handleCopyCode}
                          icon={
                            viewMode === "preview" ? (
                              <Download className="h-4 w-4" />
                            ) : isCopied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )
                          }
                        />
                      </div>
                    </div>
                    <Mermaid chart={generatedDiagram} viewMode={viewMode} />
                  </div>
                )}

                {generatedReadme && (
                  <div>
                    <h3 className="mb-4 text-lg font-semibold">
                      Generated README:
                    </h3>
                    <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4">
                      {generatedReadme}
                    </pre>
                  </div>
                )}

                {repomixOutput && (
                  <div>
                    <Button
                      variant="outline"
                      className="mb-4 w-full"
                      onClick={() => setShowRepomixOutput(!showRepomixOutput)}
                    >
                      {showRepomixOutput ? (
                        <ChevronUp className="mr-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-2 h-4 w-4" />
                      )}
                      {showRepomixOutput ? "Hide" : "Show"} Repomix Output
                    </Button>
                    {showRepomixOutput && (
                      <div className="rounded-lg border p-4">
                        <pre className="whitespace-pre-wrap text-sm">
                          {repomixOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </>
  );
}

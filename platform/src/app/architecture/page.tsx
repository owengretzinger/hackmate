"use client";

import { Suspense } from "react";
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
import { ChevronDown, ChevronUp, Download, Copy, Check } from "lucide-react";
import Mermaid from "~/components/mermaid";
import { useSearchParams } from "next/navigation";
import { ViewModeToggle, type ViewMode } from "~/components/view-mode-toggle";
import { ActionButton } from "~/components/action-button";

const formSchema = z.object({
  repoUrl: z.string().url("Please enter a valid URL"),
});

function ArchitectureForm() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [generatedDiagram, setGeneratedDiagram] = useState<string | null>(null);
  const [repomixOutput, setRepomixOutput] = useState<string | null>(null);
  const [showRepomixOutput, setShowRepomixOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diagramViewMode, setDiagramViewMode] = useState<ViewMode>("preview");
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const { data: project } = api.userProjects.getById.useQuery(
    { id: projectId! },
    {
      enabled: !!projectId,
    },
  );

  // Set initial content from project
  useState(() => {
    if (project?.architectureDiagram) {
      setGeneratedDiagram(project.architectureDiagram);
    }
  });

  const generateDiagram = api.architecture.generateDiagram.useMutation({
    onSuccess: async (data) => {
      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error,
        });
        setGeneratedDiagram(null);
        setRepomixOutput(null);
      } else {
        toast({
          description: "Architecture diagram generated successfully!",
        });
        setGeneratedDiagram(data.diagram);
        setRepomixOutput(data.repomixOutput);

        // If we have a project ID, update the project with the generated content
        if (projectId) {
          await updateProject.mutateAsync({
            id: projectId,
            architectureDiagram: data.diagram,
          });
        }
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
      setGeneratedDiagram(null);
      setRepomixOutput(null);
    },
  });

  const updateProject = api.userProjects.update.useMutation({
    onSuccess: () => {
      toast({
        description: "Project updated successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repoUrl: project?.githubUrl ?? "",
    },
  });

  // Update form when project loads
  useState(() => {
    if (project?.githubUrl) {
      form.reset({
        repoUrl: project.githubUrl,
      });
    }
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setGeneratedDiagram(null);
    setRepomixOutput(null);
    setShowRepomixOutput(false);
    await generateDiagram.mutateAsync(values);
  };

  const handleCopyCode = async () => {
    if (!generatedDiagram) return;
    await navigator.clipboard.writeText(generatedDiagram);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadSvgAsPng = () => {
    // Get the rendered SVG from the Mermaid component
    const svgElement = document.querySelector(".mermaid svg");
    if (!(svgElement instanceof SVGSVGElement)) return;

    try {
      // Create canvas with proper dimensions
      const canvas = document.createElement("canvas");
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

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();

      img.onload = () => {
        // Draw white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw scaled image
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        // Download
        const a = document.createElement("a");
        a.download = "architecture-diagram.png";
        a.href = canvas.toDataURL("image/png", 1.0);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      img.src =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error("Error generating PNG:", error);
    }
  };

  return (
    <>
      <div className="container mx-auto py-10">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>Architecture Diagram Generator</CardTitle>
            <CardDescription>
              {project ? (
                <>Generating architecture diagram for {project.name}</>
              ) : (
                <>
                  Enter a public GitHub repository URL to generate an
                  architecture diagram using AI.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-8"
              >
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
                          disabled={!!project}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Generating..." : "Generate Diagram"}
                </Button>
              </form>
            </Form>

            {generatedDiagram && (
              <div className="mt-8 space-y-8">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Architecture Diagram
                    </h3>
                    <div className="flex items-center gap-2">
                      <ViewModeToggle
                        viewMode={diagramViewMode}
                        setViewMode={setDiagramViewMode}
                      />
                      <ActionButton
                        onClick={
                          diagramViewMode === "preview"
                            ? downloadSvgAsPng
                            : handleCopyCode
                        }
                        icon={
                          diagramViewMode === "preview" ? (
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
                  <Mermaid
                    chart={generatedDiagram}
                    viewMode={diagramViewMode}
                  />
                </div>

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

export default function ArchitecturePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ArchitectureForm />
    </Suspense>
  );
}

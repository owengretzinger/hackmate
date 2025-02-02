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
  Copy,
  Check,
} from "lucide-react";
import { cn } from "~/lib/utils";
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from "next/navigation";

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

interface ContentViewProps {
  viewMode: "preview" | "code";
  content: string;
  className?: string;
}

const ContentView = ({ viewMode, content, className }: ContentViewProps) => {
  if (viewMode === "code") {
    return (
      <pre className={cn("whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm", className)}>
        <code>{content}</code>
      </pre>
    );
  }

  return (
    <div className={cn("prose dark:prose-invert max-w-none rounded-lg bg-muted p-4", className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default function ReadmePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [generatedReadme, setGeneratedReadme] = useState<string | null>(null);
  const [repomixOutput, setRepomixOutput] = useState<string | null>(null);
  const [showRepomixOutput, setShowRepomixOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [readmeViewMode, setReadmeViewMode] = useState<ViewMode>("preview");
  const [isReadmeCopied, setIsReadmeCopied] = useState(false);
  const { toast } = useToast();

  const { data: project } = api.userProjects.getById.useQuery(
    { id: projectId! },
    {
      enabled: !!projectId,
    },
  );

  // Set initial content from project
  useState(() => {
    if (project?.readme) {
      setGeneratedReadme(project.readme);
    }
  });

  const generateReadme = api.readme.generateReadme.useMutation({
    onSuccess: async (data) => {
      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error,
        });
        setGeneratedReadme(null);
        setRepomixOutput(null);
      } else {
        toast({
          description: "README generated successfully!",
        });
        setGeneratedReadme(data.readme);
        setRepomixOutput(data.repomixOutput);

        // If we have a project ID, update the project with the generated content
        if (projectId) {
          await updateProject.mutateAsync({
            id: projectId,
            readme: data.readme,
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
      setGeneratedReadme(null);
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
    setGeneratedReadme(null);
    setRepomixOutput(null);
    setShowRepomixOutput(false);
    await generateReadme.mutateAsync(values);
  };

  const handleCopyReadme = async () => {
    if (!generatedReadme) return;
    await navigator.clipboard.writeText(generatedReadme);
    setIsReadmeCopied(true);
    setTimeout(() => setIsReadmeCopied(false), 2000);
  };

  return (
    <>
      <div className="container mx-auto py-10">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>README Generator</CardTitle>
            <CardDescription>
              {project ? (
                <>Generating README for {project.name}</>
              ) : (
                <>
                  Enter a public GitHub repository URL to generate a README file using AI.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
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
                  {isLoading ? "Generating..." : "Generate README"}
                </Button>
              </form>
            </Form>

            {generatedReadme && (
              <div className="mt-8 space-y-8">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Generated README
                    </h3>
                    <div className="flex items-center gap-2">
                      <ViewModeToggle 
                        viewMode={readmeViewMode} 
                        setViewMode={setReadmeViewMode} 
                      />
                      <ActionButton
                        onClick={handleCopyReadme}
                        icon={
                          isReadmeCopied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )
                        }
                      />
                    </div>
                  </div>
                  <ContentView 
                    content={generatedReadme} 
                    viewMode={readmeViewMode}
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

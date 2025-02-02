"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { api } from "~/trpc/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { ChevronDown, ChevronUp, Copy, Check, Loader2, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { useSearchParams } from "next/navigation";
import { ViewModeToggle, type ViewMode } from "~/components/view-mode-toggle";
import { ContentView } from "~/components/content-view";
import { ActionButton } from "~/components/action-button";
import { templates } from "~/components/readme-templates/readme-templates";
import { Label } from "~/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Separator } from "~/components/ui/separator";
import { type FileData } from "~/utils/vertex-ai";
import pdfToText from "react-pdftotext";

const formSchema = z.object({
  repoUrl: z.string().url("Please enter a valid URL"),
});

function ReadmeForm() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [activeTab, setActiveTab] = useState("settings");
  const [generatedReadme, setGeneratedReadme] = useState<string | null>(null);
  const [repomixOutput, setRepomixOutput] = useState<string | null>(null);
  const [showRepomixOutput, setShowRepomixOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [readmeViewMode, setReadmeViewMode] = useState<ViewMode>("preview");
  const [templateViewMode, setTemplateViewMode] = useState<ViewMode>("preview");
  const [isReadmeCopied, setIsReadmeCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("standard");
  const [additionalContext, setAdditionalContext] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);
  const [templateContent, setTemplateContent] = useState(templates[0].content);
  const [isAdditionalContextOpen, setIsAdditionalContextOpen] = useState(false);
  const { toast } = useToast();

  const { data: project } = api.userProjects.getById.useQuery(
    { id: projectId! },
    {
      enabled: !!projectId,
    },
  );

  // Set initial content from project
  useEffect(() => {
    if (project?.readme) {
      setGeneratedReadme(project.readme);
      setActiveTab("readme");
    }
  }, [project]);

  // Update template content when template is selected
  useEffect(() => {
    if (templates.length === 0) return;
    const template =
      templates.find((t) => t.id === selectedTemplate) ?? templates[0];
    setTemplateContent(template.content);
  }, [selectedTemplate]);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "";
      textAreaRef.current.style.height =
        textAreaRef.current.scrollHeight + "px";
    }
  };

  useEffect(() => {
    if (templateContent) {
      resizeTextarea();
    }
  }, [templateContent, templateViewMode]);

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
        setActiveTab("readme");

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
  useEffect(() => {
    if (project?.githubUrl) {
      form.reset({
        repoUrl: project.githubUrl,
      });
    }
  }, [project, form]);

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const text = await pdfToText(file);
      return text;
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      throw new Error("Failed to extract text from PDF");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles: File[] = [];
      const skippedFiles: string[] = [];

      Array.from(e.target.files).forEach((file) => {
        if (
          file.type === "application/pdf" ||
          file.type.startsWith("text/") ||
          file.type.includes("javascript") ||
          file.type.includes("json") ||
          /\.(txt|md|js|jsx|ts|tsx|json|yaml|yml|xml|csv|html|css|scss|less|pdf)$/i.test(
            file.name,
          )
        ) {
          validFiles.push(file);
        } else {
          skippedFiles.push(file.name);
        }
      });

      if (skippedFiles.length > 0) {
        toast({
          title: "Unsupported files skipped",
          description: `Only text files and PDFs are supported. Skipped: ${skippedFiles.join(", ")}`,
          variant: "default",
        });
      }

      // Create new FileList with only valid files
      const dt = new DataTransfer();
      validFiles.forEach((file) => dt.items.add(file));
      setUploadedFiles(dt.files);
    }
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setGeneratedReadme(null);
    setRepomixOutput(null);
    setShowRepomixOutput(false);

    try {
      // Process uploaded files
      const processedFiles: FileData[] = [];

      if (uploadedFiles) {
        for (const file of Array.from(uploadedFiles)) {
          let content: string;
          if (file.type === "application/pdf") {
            content = await extractPdfText(file);
          } else {
            content = await file.text();
          }

          processedFiles.push({
            name: file.name,
            content,
            type: file.type,
          });
        }
      }

      await generateReadme.mutateAsync({
        ...values,
        templateId: selectedTemplate,
        additionalContext,
        files: processedFiles,
      });
    } catch (error) {
      console.error("File processing error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process files. Please try again.",
      });
      setIsLoading(false);
    }
  };

  const handleCopyReadme = async () => {
    if (!generatedReadme) return;
    await navigator.clipboard.writeText(generatedReadme);
    setIsReadmeCopied(true);
    setTimeout(() => setIsReadmeCopied(false), 2000);
  };

  const handleFileDelete = (indexToDelete: number) => {
    if (!uploadedFiles) return;
    const dt = new DataTransfer();
    Array.from(uploadedFiles).forEach((file, index) => {
      if (index !== indexToDelete) {
        dt.items.add(file);
      }
    });
    setUploadedFiles(dt.files);
  };

  return (
    <div className="p-8">
      <h1 className="mb-8 text-4xl font-bold">
        {project ? `README Generator - ${project.name}` : "README Generator"}
      </h1>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="settings">Generation Settings</TabsTrigger>
          <TabsTrigger value="readme">Generated README</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 pt-2">
              <h3 className="text-lg font-semibold">GitHub Repository URL</h3>
              <Form {...form}>
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="repoUrl"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Enter repository URL..."
                            {...field}
                            disabled={!!project}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Generate README
                  </Button>
                </div>
              </Form>
            </div>

            <div className="space-y-2">
              <Collapsible
                open={isAdditionalContextOpen}
                onOpenChange={setIsAdditionalContextOpen}
              >
                <CollapsibleTrigger className="flex w-full items-center justify-center gap-2 rounded-lg border p-2 text-sm hover:bg-accent">
                  <span>Add custom instructions or upload files</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      isAdditionalContextOpen && "rotate-180",
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                  <div className="rounded-lg bg-card">
                    <div className="grid grid-cols-2 divide-x">
                      <div className="space-y-3 pr-6">
                        <div>
                          <Label className="font-medium">
                            Custom Instructions
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Write anything else you want the AI to know about
                            the project.
                          </p>
                        </div>
                        <Textarea
                          id="context"
                          placeholder="Add any additional context..."
                          value={additionalContext}
                          onChange={(e) => setAdditionalContext(e.target.value)}
                          className="h-[150px] resize-none"
                        />
                      </div>

                      <div className="space-y-3 pl-6">
                        <div>
                          <Label className="font-medium">Upload Files</Label>
                          <p className="text-sm text-muted-foreground">
                            Attach any additional context (ex. project
                            documents)
                          </p>
                        </div>
                        <Input
                          id="files"
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                        {uploadedFiles && (
                          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                            {Array.from(uploadedFiles).map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="truncate">{file.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleFileDelete(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Separator />

            <div className="grid grid-cols-2 divide-x">
              <div className="pr-6">
                <h3 className="text-lg font-semibold">Template Selection</h3>
                <div className="mt-4 space-y-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        "cursor-pointer rounded-lg border p-4 transition-all hover:shadow-lg",
                        selectedTemplate === template.id && "border-primary",
                      )}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pl-6">
                <div className="flex w-full items-center justify-between">
                  <h3 className="text-lg font-semibold">Template Preview</h3>
                  <ViewModeToggle
                    viewMode={templateViewMode}
                    setViewMode={setTemplateViewMode}
                  />
                </div>
                <div className="mt-4">
                  {templateViewMode === "edit" ? (
                    <Textarea
                      onInput={resizeTextarea}
                      value={templateContent}
                      onChange={(e) => setTemplateContent(e.target.value)}
                      className="w-full resize-none overflow-hidden font-mono"
                      ref={textAreaRef}
                    />
                  ) : (
                    <ContentView
                      content={templateContent}
                      viewMode="preview"
                      className="min-h-[500px] w-full rounded-lg border p-4"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="readme">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Generated README</h3>
                <p className="text-sm text-muted-foreground">
                  Review and customize your generated README
                </p>
              </div>
              {generatedReadme && (
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
              )}
            </div>
            {generatedReadme ? (
              <div className="space-y-8">
                <ContentView
                  content={generatedReadme}
                  viewMode={readmeViewMode}
                  className="min-h-[600px]"
                />

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
            ) : (
              <div className="text-center text-muted-foreground">
                Generate a README first
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  );
}

export default function ReadmePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReadmeForm />
    </Suspense>
  );
}

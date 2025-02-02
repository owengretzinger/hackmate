"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { api } from "~/trpc/react";
import { Loader2, Mic, StopCircle, Copy, Check } from "lucide-react";
import { ViewModeToggle, type ViewMode } from "~/components/view-mode-toggle";
import { ContentView } from "~/components/content-view";
import { ActionButton } from "~/components/action-button";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";
import { useSearchParams } from "next/navigation";
import { pitchTemplates } from "~/components/pitch-templates";

function PitchForm() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [isCopied, setIsCopied] = useState(false);
  const [pitchDraft, setPitchDraft] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState({
    title: "",
    description: "",
    technologies: [] as string[],
    targetAudience: "",
    uniqueSellingPoints: [] as string[],
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const { toast } = useToast();

  const { data: project } = api.userProjects.getById.useQuery(
    { id: projectId! },
    {
      enabled: !!projectId,
    },
  );

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

  const generatePitch = api.pitch.generatePitchDraft.useMutation({
    onSuccess: async (data) => {
      if (data.pitchDraft) {
        setPitchDraft(data.pitchDraft);
        toast({
          description: "Pitch generated successfully!",
        });

        // If we have a project ID, update the project with the generated content
        if (projectId) {
          await updateProject.mutateAsync({
            id: projectId,
            pitchDraft: data.pitchDraft,
          });
        }

        setActiveTab("draft");
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const analyzePitch = api.pitch.analyzePitchRecording.useMutation({
    onSuccess: (data) => {
      if (data.feedback) {
        toast({
          description: "Pitch analysis completed!",
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Set initial content from project
  useEffect(() => {
    if (project) {
      setProjectDetails({
        title: project.name,
        description: project.readme ?? "",
        technologies: [],
        targetAudience: "",
        uniqueSellingPoints: [],
      });

      // If project has a pitch draft, go straight to draft tab and set the content
      if (project.pitchDraft) {
        setPitchDraft(project.pitchDraft);
        setActiveTab("draft");
      }
    }
  }, [project]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      const startTime = Date.now();

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordingBlob(blob);
        setRecordingDuration((Date.now() - startTime) / 1000);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // For demo purposes, stop after 3 minutes
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 180000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
      });
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    // MediaRecorder will be stopped in the stream cleanup
  };

  const handleGeneratePitch = async () => {
    if (
      !selectedTemplate ||
      !projectDetails.title ||
      !projectDetails.description
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    await generatePitch.mutateAsync({
      templateId: selectedTemplate,
      projectDetails,
    });
  };

  const handleCopyPitch = async () => {
    if (!pitchDraft) return;
    await navigator.clipboard.writeText(pitchDraft);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      <div className="container mx-auto py-8">
        <h1 className="mb-8 text-4xl font-bold">
          {project ? `Pitch Assistant - ${project.name}` : "Pitch Assistant"}
        </h1>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="templates">Choose Template</TabsTrigger>
            <TabsTrigger value="details">Project Details</TabsTrigger>
            <TabsTrigger value="draft">Generated Draft</TabsTrigger>
            <TabsTrigger value="practice">Practice & Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {pitchTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate === template.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-inside list-disc">
                      {template.sections.map((section) => (
                        <li key={section}>{section}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button
              onClick={() => setActiveTab("details")}
              disabled={!selectedTemplate}
              className="mt-4"
            >
              Next: Add Project Details
            </Button>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
                <CardDescription>
                  Fill in the details about your project to generate a
                  customized pitch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Title</label>
                  <input
                    type="text"
                    className="w-full rounded-md border p-2"
                    value={projectDetails.title}
                    onChange={(e) =>
                      setProjectDetails({
                        ...projectDetails,
                        title: e.target.value,
                      })
                    }
                    disabled={!!project}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={projectDetails.description}
                    onChange={(e) =>
                      setProjectDetails({
                        ...projectDetails,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Technologies (comma-separated)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border p-2"
                    value={projectDetails.technologies.join(", ")}
                    onChange={(e) =>
                      setProjectDetails({
                        ...projectDetails,
                        technologies: e.target.value
                          .split(",")
                          .map((t) => t.trim()),
                      })
                    }
                  />
                </div>
                <Button
                  onClick={handleGeneratePitch}
                  disabled={generatePitch.isPending}
                  className="mt-4"
                >
                  {generatePitch.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Pitch Draft
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="draft">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Generated Pitch Draft</CardTitle>
                    <CardDescription>
                      Review and customize your generated pitch draft
                    </CardDescription>
                  </div>
                  {pitchDraft && (
                    <div className="flex items-center gap-2">
                      <ViewModeToggle
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                      />
                      <ActionButton
                        onClick={handleCopyPitch}
                        icon={
                          isCopied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pitchDraft ? (
                  <div className="space-y-4">
                    <ContentView
                      content={pitchDraft}
                      viewMode={viewMode}
                      className="min-h-[600px]"
                    />
                    {projectId && (
                      <Button
                        onClick={() =>
                          updateProject.mutate({
                            id: projectId,
                            pitchDraft: pitchDraft,
                          })
                        }
                        disabled={updateProject.isPending}
                      >
                        {updateProject.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    Generate a pitch draft first
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practice">
            <Card>
              <CardHeader>
                <CardTitle>Practice Your Pitch</CardTitle>
                <CardDescription>
                  Record yourself practicing the pitch to get AI feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                  >
                    {isRecording ? (
                      <>
                        <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="mr-2 h-4 w-4" /> Start Recording
                      </>
                    )}
                  </Button>
                </div>

                {recordingBlob && (
                  <div className="space-y-4">
                    <audio controls src={URL.createObjectURL(recordingBlob)} />
                    <Button
                      onClick={async () => {
                        if (!recordingBlob || !selectedTemplate) return;

                        try {
                          // In a real implementation, you would:
                          // 1. Upload the audio to a server
                          // 2. Use speech-to-text to get transcription
                          // For demo, we'll use a mock transcription
                          const mockTranscription =
                            "This is a mock transcription of the pitch...";

                          await analyzePitch.mutateAsync({
                            transcription: mockTranscription,
                            duration: recordingDuration,
                            templateId: selectedTemplate,
                          });
                        } catch (error) {
                          console.error("Error analyzing pitch:", error);
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description:
                              "Failed to analyze pitch. Please try again.",
                          });
                        }
                      }}
                      disabled={analyzePitch.isPending}
                    >
                      {analyzePitch.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Get Feedback
                    </Button>
                  </div>
                )}

                {analyzePitch.data?.feedback && (
                  <Alert>
                    <AlertTitle>Pitch Analysis</AlertTitle>
                    <AlertDescription>
                      <div
                        className="prose max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{
                          __html: analyzePitch.data.feedback.replace(
                            /\n/g,
                            "<br />",
                          ),
                        }}
                      />
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </>
  );
}

export default function PitchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PitchForm />
    </Suspense>
  );
}

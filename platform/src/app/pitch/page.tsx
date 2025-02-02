"use client";

import { useState } from "react";
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
import { Loader2, Mic, StopCircle } from "lucide-react";

export default function PitchPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [projectDetails, setProjectDetails] = useState({
    title: "",
    description: "",
    technologies: [] as string[],
    targetAudience: "",
    uniqueSellingPoints: [] as string[],
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  //   const [transcription, setTranscription] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);

  const { data: templates } = api.pitch.getTemplates.useQuery();
  const generatePitch = api.pitch.generatePitchDraft.useMutation();
  const analyzePitch = api.pitch.analyzePitchRecording.useMutation();

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
      alert("Could not access microphone. Please check permissions.");
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
      alert("Please fill in all required fields");
      return;
    }

    try {
      await generatePitch.mutateAsync({
        templateId: selectedTemplate,
        projectDetails,
      });
      setActiveTab("draft");
    } catch (error) {
      console.error("Error generating pitch:", error);
      alert("Failed to generate pitch. Please try again.");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-4xl font-bold">Pitch Assistant</h1>

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
            {templates?.map((template) => (
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
                Fill in the details about your project to generate a customized
                pitch
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
              <CardTitle>Generated Pitch Draft</CardTitle>
              <CardDescription>
                Review and customize your generated pitch draft
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatePitch.data?.pitchDraft ? (
                <div className="prose max-w-none dark:prose-invert">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generatePitch.data.pitchDraft.replace(
                        /\n/g,
                        "<br />",
                      ),
                    }}
                  />
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
                        alert("Failed to analyze pitch. Please try again.");
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
  );
}

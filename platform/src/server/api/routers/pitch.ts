import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { generateText } from "~/utils/vertex-ai";

const pitchTemplates = [
  {
    id: "problem-solution",
    name: "Problem-Solution",
    description:
      "Classic format focusing on the problem, solution, and market opportunity",
    sections: [
      "Problem Statement",
      "Solution Overview",
      "Market Opportunity",
      "Technical Implementation",
      "Business Model",
    ],
  },
  {
    id: "story-driven",
    name: "Story-Driven",
    description:
      "Narrative approach that tells a compelling story about your project",
    sections: [
      "Hook/Opening",
      "Personal Story",
      "Problem Revelation",
      "Solution Journey",
      "Impact & Vision",
    ],
  },
  {
    id: "demo-focused",
    name: "Demo-Focused",
    description: "Emphasizes live demonstration and technical achievements",
    sections: [
      "Quick Intro",
      "Technical Overview",
      "Live Demo Script",
      "Innovation Highlights",
      "Future Roadmap",
    ],
  },
];

export const pitchRouter = createTRPCRouter({
  getTemplates: publicProcedure.query(() => {
    return pitchTemplates;
  }),

  generatePitchDraft: publicProcedure
    .input(
      z.object({
        templateId: z.string(),
        projectDetails: z.object({
          title: z.string(),
          description: z.string(),
          technologies: z.array(z.string()),
          targetAudience: z.string().optional(),
          uniqueSellingPoints: z.array(z.string()).optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const template = pitchTemplates.find((t) => t.id === input.templateId);
      if (!template) throw new Error("Template not found");

      const prompt = `Create a hackathon pitch presentation draft for the following project:
      
Project Title: ${input.projectDetails.title}
Description: ${input.projectDetails.description}
Technologies: ${input.projectDetails.technologies.join(", ")}
${input.projectDetails.targetAudience ? `Target Audience: ${input.projectDetails.targetAudience}` : ""}
${input.projectDetails.uniqueSellingPoints?.length ? `Unique Selling Points: ${input.projectDetails.uniqueSellingPoints.join(", ")}` : ""}

Please create a structured pitch following the ${template.name} template with the following sections:
${template.sections.join("\n")}

For each section, provide detailed talking points and suggestions for delivery.`;

      const pitchDraft = await generateText(prompt);
      return { pitchDraft };
    }),

  analyzePitchRecording: publicProcedure
    .input(
      z.object({
        transcription: z.string(),
        duration: z.number(),
        templateId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const prompt = `Analyze this hackathon pitch transcription and provide detailed feedback:

Transcription: "${input.transcription}"
Duration: ${input.duration} seconds

Please provide feedback on:
1. Clarity and structure
2. Pacing and timing
3. Key points coverage
4. Engagement and delivery
5. Technical explanation quality
6. Specific improvement suggestions

Format the feedback in a constructive and actionable way.`;

      const feedback = await generateText(prompt);
      return { feedback };
    }),
});

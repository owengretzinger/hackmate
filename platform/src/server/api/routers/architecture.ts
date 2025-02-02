import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { generateReadmeWithAI } from "~/utils/vertex-ai";
import { packRepositoryWithRepomix } from "~/utils/repomix";

type GenerateArchitectureResponse =
  | { success: true; diagram: string; repomixOutput: string; error?: never }
  | { success: false; error: string; diagram?: never; repomixOutput?: never };

export const architectureRouter = createTRPCRouter({
  generateDiagram: publicProcedure
    .input(z.object({ repoUrl: z.string().url() }))
    .mutation(async ({ input }): Promise<GenerateArchitectureResponse> => {
      console.log(
        "Starting architecture diagram generation for:",
        input.repoUrl,
      );

      try {
        // Pack repository using repomix
        const repomixResult = await packRepositoryWithRepomix(input.repoUrl);
        if (!repomixResult.success) {
          return {
            success: false,
            error: repomixResult.error,
          };
        }

        // Generate diagram using Vertex AI
        console.log("Generating content with Vertex AI...");
        const result = await generateReadmeWithAI(repomixResult.packedContent);

        return {
          success: true,
          diagram: result.diagram,
          repomixOutput: repomixResult.repomixOutput,
        };
      } catch (error) {
        console.log("Error:", error);
        return {
          success: false,
          error: "An unexpected error occurred. Please try again later.",
        };
      }
    }),
});

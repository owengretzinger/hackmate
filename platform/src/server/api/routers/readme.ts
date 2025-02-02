import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { generateReadmeWithAI } from "~/utils/vertex-ai";
import { packRepositoryWithRepomix } from "~/utils/repomix";

type GenerateReadmeResponse =
  | { success: true; readme: string; repomixOutput: string; error?: never }
  | { success: false; error: string; readme?: never; repomixOutput?: never };

export const readmeRouter = createTRPCRouter({
  generateReadme: publicProcedure
    .input(z.object({ repoUrl: z.string().url() }))
    .mutation(async ({ input }): Promise<GenerateReadmeResponse> => {
      console.log("Starting README generation for:", input.repoUrl);

      try {
        // Pack repository using repomix
        const repomixResult = await packRepositoryWithRepomix(input.repoUrl);
        if (!repomixResult.success) {
          return {
            success: false,
            error: repomixResult.error,
          };
        }

        // Generate README using Vertex AI
        console.log("Generating content with Vertex AI...");
        const result = await generateReadmeWithAI(repomixResult.packedContent);

        return {
          success: true,
          readme: result.readme,
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

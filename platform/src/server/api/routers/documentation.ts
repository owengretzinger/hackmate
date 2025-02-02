import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { generateReadmeWithAI, USE_MOCK } from "~/utils/vertex-ai";

const execAsync = promisify(exec);

type GenerateReadmeResponse = 
  | { success: true; readme: string; diagram: string; repomixOutput: string; error?: never }
  | { success: false; error: string; readme?: never; diagram?: never; repomixOutput?: never };

export const documentationRouter = createTRPCRouter({
  generateReadme: publicProcedure
    .input(z.object({ repoUrl: z.string().url() }))
    .mutation(async ({ input }): Promise<GenerateReadmeResponse> => {
      console.log("Starting README generation for:", input.repoUrl);
      
      try {
        if (!USE_MOCK.repomix) {
          const repoName = input.repoUrl.split("/").pop() ?? "repo";
          const tempDir = path.join(process.cwd(), "temp");
          const outputFile = path.join(tempDir, `${repoName}-repomix.txt`);

          console.log("Creating temp directory:", tempDir);
          await fs.mkdir(tempDir, { recursive: true });

          // Use repomix to pack the repository
          console.log("Running repomix...");
          const { stdout, stderr: repomixError } = await execAsync(
            `cd "${tempDir}" && npx repomix --remote ${input.repoUrl} --output ./${repoName}-repomix.txt`
          );
          console.log("Repomix output:", stdout);
          
          if (repomixError) {
            console.log("Repomix error:", repomixError);
            return {
              success: false,
              error: "Repository not found or not accessible. Please make sure it exists and is public.",
            };
          }

          // Read the packed file
          console.log("Reading packed file:", outputFile);
          const packedContent = await fs.readFile(outputFile, "utf-8").catch(() => null);

          if (!packedContent) {
            return {
              success: false,
              error: "Failed to process repository content. Please try again.",
            };
          }

          console.log("Packed file length:", packedContent.length);

          // Generate README and diagram using Vertex AI
          console.log("Generating content with Vertex AI...");
          const result = await generateReadmeWithAI(packedContent);

          // Clean up
          console.log("Cleaning up...");
          await fs.unlink(outputFile).catch(console.error);

          return {
            success: true,
            ...result,
          };
        } else {
          // Using mock mode - skip repomix
          console.log("Using mock mode - skipping repomix");
          const result = await generateReadmeWithAI("");
          
          return {
            success: true,
            ...result,
          };
        }
      } catch (error) {
        console.log("Error:", error);
        return {
          success: false,
          error: "An unexpected error occurred. Please try again later.",
        };
      }
    }),
}); 
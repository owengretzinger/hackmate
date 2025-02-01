import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

type GenerateReadmeResponse = 
  | { success: true; readme: string; repomixOutput: string; error?: never }
  | { success: false; error: string; readme?: never; repomixOutput?: never };

export const readmeRouter = createTRPCRouter({
  generateReadme: publicProcedure
    .input(z.object({ repoUrl: z.string().url() }))
    .mutation(async ({ input }): Promise<GenerateReadmeResponse> => {
      console.log("Starting README generation for:", input.repoUrl);
      const repoName = input.repoUrl.split("/").pop() ?? "repo";
      const tempDir = path.join(process.cwd(), "temp");
      const outputFile = path.join(tempDir, `${repoName}-repomix.txt`);

      try {
        console.log("Creating temp directory:", tempDir);
        await fs.mkdir(tempDir, { recursive: true });

        // Use repomix to pack the repository
        console.log("Running repomix...");
        const { stdout: repomixOutput, stderr: repomixError } = await execAsync(
          `cd "${tempDir}" && npx repomix --remote ${input.repoUrl} --output ./${repoName}-repomix.txt`
        );
        console.log("Repomix output:", repomixOutput);
        
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

        // TODO: Use Vertex AI to generate README
        // For now, return a mock response
        console.log("Generating README...");
        const mockReadme = "# Generated README\n\nThis is a mock README generated for testing purposes.";

        // Clean up
        console.log("Cleaning up...");
        await fs.unlink(outputFile).catch(console.error);

        return {
          success: true,
          readme: mockReadme,
          repomixOutput: packedContent,
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
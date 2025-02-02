import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { USE_MOCK } from "./vertex-ai";

const execAsync = promisify(exec);

// Cache for repomix outputs
const repomixCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000;

type RepomixResult =
  | {
      success: true;
      packedContent: string;
      repomixOutput: string;
      error?: never;
    }
  | {
      success: false;
      error: string;
      packedContent?: never;
      repomixOutput?: never;
    };

export async function packRepositoryWithRepomix(
  repoUrl: string,
): Promise<RepomixResult> {
  if (USE_MOCK.repomix) {
    return {
      success: true,
      packedContent: "",
      repomixOutput: "Mock repomix output",
    };
  }

  // Check cache first
  const cached = repomixCache.get(repoUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log("Using cached repomix output for:", repoUrl);
    return {
      success: true,
      packedContent: cached.content,
      repomixOutput: "Using cached repomix output",
    };
  }

  try {
    const repoName = repoUrl.split("/").pop() ?? "repo";
    const tempDir = path.join(process.cwd(), "temp");
    const outputFile = path.join(tempDir, `${repoName}-repomix.txt`);

    console.log("Creating temp directory:", tempDir);
    await fs.mkdir(tempDir, { recursive: true });

    // Use repomix to pack the repository
    console.log("Running repomix...");
    const { stdout, stderr: repomixError } = await execAsync(
      `cd "${tempDir}" && npx repomix --remote ${repoUrl} --output ./${repoName}-repomix.txt`,
    );
    console.log("Repomix output:", stdout);

    if (repomixError) {
      console.log("Repomix error:", repomixError);
      return {
        success: false,
        error:
          "Repository not found or not accessible. Please make sure it exists and is public.",
      };
    }

    // Read the packed file
    console.log("Reading packed file:", outputFile);
    const packedContent = await fs
      .readFile(outputFile, "utf-8")
      .catch(() => null);

    if (!packedContent) {
      return {
        success: false,
        error: "Failed to process repository content. Please try again.",
      };
    }

    console.log("Packed file length:", packedContent.length);

    // Cache the result
    repomixCache.set(repoUrl, {
      content: packedContent,
      timestamp: Date.now(),
    });

    // Clean up
    console.log("Cleaning up...");
    await fs.unlink(outputFile).catch(console.error);

    return {
      success: true,
      packedContent,
      repomixOutput: stdout,
    };
  } catch (error) {
    console.log("Error:", error);
    return {
      success: false,
      error:
        "An unexpected error occurred while packing the repository. Please try again later.",
    };
  }
}

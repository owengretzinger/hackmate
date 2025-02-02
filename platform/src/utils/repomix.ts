import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { USE_MOCK } from "./vertex-ai";

const execAsync = promisify(exec);

// Cache for repomix outputs
const repomixCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000;

// Token limit configuration
const MAX_TOKENS = 1_000_000;

// Helper type for file stats
type FileStats = {
  path: string;
  chars: number;
  tokens: number;
};

// Helper function to parse repomix output for file stats
function parseRepomixOutput(output: string): {
  totalTokens: number;
  topFiles: FileStats[];
} {
  const topFiles: FileStats[] = [];
  let totalTokens = 0;

  // Extract total tokens
  const tokenRegex = /Total Tokens: ([\d,]+) tokens/;
  const tokenResult = tokenRegex.exec(output);
  if (tokenResult?.[1]) {
    totalTokens = parseInt(tokenResult[1].replace(/,/g, ""));
  }

  // Extract top files
  const lines = output.split("\n");
  let inTopFiles = false;
  const fileRegex =
    /(\d+)\.\s+(.+?)\s+\(([,\d]+)\s*chars,\s*([,\d]+)\s*tokens\)/;

  for (const line of lines) {
    if (line.includes("Top 5 Files by Character Count")) {
      inTopFiles = true;
      continue;
    }
    if (inTopFiles && /^\d+\./.test(line)) {
      const result = fileRegex.exec(line);
      if (result?.[2] && result?.[3] && result?.[4]) {
        topFiles.push({
          path: result[2].trim(),
          chars: parseInt(result[3].replace(/,/g, "")),
          tokens: parseInt(result[4].replace(/,/g, "")),
        });
      }
    }
    if (inTopFiles && line.trim() === "") {
      break;
    }
  }

  return { totalTokens, topFiles };
}

const IGNORE_PATTERNS = [
  // Data files
  "**/*.csv",
  "**/*.json",
  "**/*.sqlite",
  "**/*.db",
  // Build artifacts
  "dist/**",
  "build/**",
  ".next/**",
  "node_modules/**",
  // Logs and caches
  "**/*.log",
  ".cache/**",
  "tmp/**",
  // Version control
  ".git/**",
  // IDE files
  ".idea/**",
  ".vscode/**",
  // Test files and coverage
  "**/__tests__/**",
  "**/*.test.*",
  "coverage/**",
  // Assets
  "**/*.png",
  "**/*.jpg",
  "**/*.jpeg",
  "**/*.gif",
  "**/*.svg",
  "**/*.ico",
  "**/*.mp4",
  "**/*.mp3",
  "**/*.pdf",
  // Large data directories
  "data/**",
  "datasets/**",
  "assets/**",
].join(",");

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

    // Use repomix to pack the repository with include/exclude patterns
    console.log("Running repomix...");
    const { stdout, stderr: repomixError } = await execAsync(
      `cd "${tempDir}" && npx repomix --remote ${repoUrl} --output ./${repoName}-repomix.txt --ignore "${IGNORE_PATTERNS}"`,
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

    // Parse repomix output and check token limit
    const { totalTokens, topFiles } = parseRepomixOutput(stdout);
    if (totalTokens > MAX_TOKENS) {
      const topFilesMessage = topFiles
        .map(
          (file) =>
            `- ${file.path} (${(file.tokens / 1000).toFixed(1)}k tokens, ${(
              file.chars / 1000
            ).toFixed(1)}k chars)`,
        )
        .join("\n");

      return {
        success: false,
        error: `Repository is too large to process (${(
          totalTokens / 1000
        ).toFixed(
          1,
        )}k tokens > ${MAX_TOKENS / 1000}k limit).\n\nLargest files:\n${topFilesMessage}\n\nPlease try:\n1. Excluding large data files\n2. Using a smaller subset of the repository\n3. Breaking up the request into smaller parts`,
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

import { VertexAI } from "@google-cloud/vertexai";
import { env } from "../env.js";
import {
  MOCK_PITCH_DRAFT,
  MOCK_PITCH_FEEDBACK,
  MOCK_REPO_CONTENT,
  EXAMPLE_DIAGRAM,
  EXAMPLE_README,
} from "./mock-ai-responses";

// Flags for testing - set to true to use mock responses
export const USE_MOCK = {
  ai: env.USE_MOCK_RESPONSES === "true", // Use mock AI responses instead of calling Vertex AI
  repomix: env.USE_MOCK_RESPONSES === "true", // Skip repomix and use mock repository content
  pitch: env.USE_MOCK_RESPONSES === "true", // Use mock pitch responses
} as const;

// Initialize Vertex with your Cloud project and location
const vertex_ai = new VertexAI({
  project: env.GOOGLE_CLOUD_PROJECT_ID,
  location: env.GOOGLE_CLOUD_LOCATION,
});

// Select a model
const model = vertex_ai.preview.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.4,
    topP: 0.8,
    topK: 40,
  },
});

export type GenerateResponse = {
  readme: string;
  diagram: string;
  repomixOutput: string;
};

export async function generateReadmeWithAI(
  repoContent: string,
): Promise<GenerateResponse> {
  if (USE_MOCK.ai) {
    // Mock delay for testing
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      readme: EXAMPLE_README,
      diagram: EXAMPLE_DIAGRAM,
      repomixOutput: USE_MOCK.repomix ? MOCK_REPO_CONTENT : repoContent,
    };
  }

  try {
    // Generate README
    const readmePrompt = `You are an expert technical writer tasked with creating a comprehensive README.md file for a GitHub repository.
I will provide you with the repository's code content, and you should generate a detailed, well-structured README.md file.

The README should include:
1. Project title and description
2. Key features
3. Technologies used
4. Installation instructions
5. Usage examples
6. Contributing guidelines (if applicable)
7. License information (if found in the code)

Make the README engaging, professional, and informative. Use proper Markdown formatting.
Here's the repository content:

${repoContent}

Generate a README.md file based on this content.`;

    // Generate diagram
    const diagramPrompt = `You are a software architect tasked with creating a high-level Mermaid.js diagram that visualizes the core architecture of a GitHub repository.

IMPORTANT:
- Focus ONLY on the main components and their relationships
- Keep the diagram simple and clear (max 10-15 nodes)
- Show the high-level flow, not implementation details
- Group related components into subgraphs
- Avoid showing individual functions or files
- DO NOT include any markdown formatting or backticks in your response
- Return ONLY the raw diagram code starting with "graph TD"

Based on the repository content, show:
1. Core system components (Frontend, Backend, Database, etc.)
2. Main data flow between components
3. Key external services and integrations
4. Logical groupings using subgraphs

CRITICAL SYNTAX RULES - FOLLOW THESE EXACTLY:
1. Node IDs must be simple letters like A, B, C or words like Frontend, Backend (NO special characters)
2. Put ALL text with special characters inside square brackets as labels
3. NEVER use dots, curly braces, or special characters in node IDs
4. Use only --> for arrows
5. Subgraphs must follow this exact format:
   subgraph Name
       content
   end
6. Start your response directly with "graph TD" - no backticks, no markdown

Here's a good example of a high-level architecture diagram (note how it starts directly with "graph TD"):

graph TD
    Frontend[Next.js Frontend] --> API[tRPC API Layer]
    API --> Backend[Backend Services]
    
    subgraph FrontendComponents
        Frontend --> Components[React Components]
        Components --> UI[UI Components]
        UI --> Shadcn[shadcn/ui Library]
    end
    
    subgraph BackendServices
        Backend --> Generator[Documentation Generator]
        Backend --> Auth[Auth Service]
        Generator --> VertexAI[Vertex AI]
        Generator --> Repomix[Repomix Parser]
    end
    
    subgraph DatabaseLayer
        Backend --> DB[PostgreSQL]
        DB --> Data[Project Data]
    end

Here's the repository content:

${repoContent}

Generate a HIGH-LEVEL Mermaid.js diagram that represents the core architecture. Start your response directly with "graph TD" without any backticks or markdown formatting.
Remember: Keep it simple, clear, and focused on the big picture.`;

    const [readmeResult, diagramResult] = await Promise.all([
      model.generateContent(readmePrompt),
      model.generateContent(diagramPrompt),
    ]);

    const readme =
      readmeResult.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    const diagram =
      diagramResult.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!readme || !diagram) {
      throw new Error("No response from AI model");
    }

    return {
      readme,
      diagram,
      repomixOutput: repoContent,
    };
  } catch (error) {
    console.error("Error generating content with Vertex AI:", error);
    throw error;
  }
}

export async function generateText(prompt: string): Promise<string> {
  if (USE_MOCK.pitch) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
    if (prompt.includes("pitch presentation draft")) {
      return MOCK_PITCH_DRAFT;
    } else if (prompt.includes("pitch transcription")) {
      return MOCK_PITCH_FEEDBACK;
    }
  }

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text;
  } catch (error) {
    console.error("Error generating text:", error);
    throw new Error("Failed to generate text using Vertex AI");
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddingModel = vertex_ai.preview.getGenerativeModel({
      model: "embedding-001",
    });
    const result = await embeddingModel.generateContent(text);
    const response = result.response;
    const embedding =
      response.candidates?.[0]?.content?.parts?.[0]?.text
        ?.split(",")
        .map(Number) ?? [];
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding using Vertex AI");
  }
}

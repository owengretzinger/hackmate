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

export type GenerateReadmeResponse = {
  readme: string;
  repomixOutput: string;
};

export type GenerateArchitectureResponse = {
  diagram: string;
  repomixOutput: string;
};

export type FileData = {
  name: string;
  content: string;
  type: string;
};

export async function generateReadmeWithAI(
  repoContent: string,
  templateContent: string,
  additionalContext: string,
  files?: FileData[],
): Promise<GenerateReadmeResponse> {
  if (USE_MOCK.ai) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      readme: EXAMPLE_README,
      repomixOutput: USE_MOCK.repomix ? MOCK_REPO_CONTENT : repoContent,
    };
  }

  try {
    // Process uploaded files
    const fileContents =
      files
        ?.map(
          (file) => `File: ${file.name} (${file.type})\n${file.content}\n---\n`,
        )
        .join("\n") ?? "";

    const readmePrompt = `You are an expert technical writer tasked with creating a comprehensive README.md file for a GitHub repository.

CRITICAL FORMATTING REQUIREMENTS:
- DO NOT wrap the output in markdown formatting tags like \`\`\`md (other code blocks are allowed)
- START your response directly with the content
- ONLY return the raw README content
- ANY deviation from these requirements will result in failure
- YOU MUST PRESERVE ALL HTML TAGS AND ATTRIBUTES EXACTLY AS SHOWN IN THE TEMPLATE
- DO NOT MODIFY OR OMIT ANY HTML FORMATTING
- INCLUDE ALL <div>, <p>, <h3>, <details>, <summary>, AND OTHER HTML TAGS
- MAINTAIN ALL align="center" AND OTHER HTML ATTRIBUTES
- KEEP THE EXACT SAME STRUCTURE INCLUDING NEWLINES AND SPACING

CONTENT REQUIREMENTS:
- Create a detailed, well-structured README.md file
- Make it engaging, professional, and informative
- Use proper Markdown syntax for headings, lists, code blocks, etc.
- Follow the template structure EXACTLY
- Incorporate specific requirements from additional context
- Include relevant information from uploaded files
- NEVER skip or modify HTML formatting from the template

HERE IS THE EXACT TEMPLATE TO FOLLOW - COPY ITS STRUCTURE AND HTML EXACTLY:
${templateContent}

ADDITIONAL INSTRUCTIONS AND CONTEXT PROVIDED BY THE USER: ${additionalContext}

${fileContents ? `FILE CONTENT UPLOADED BY THE USER:\n${fileContents}\n` : ""}

REPOSITORY CONTENT:
${repoContent}

Remember: 
1. Start your response DIRECTLY with the README content
2. DO NOT WRAP THE OUTPUT IN MARKDOWN FORMATTING TAGS
3. PRESERVE ALL HTML TAGS AND ATTRIBUTES EXACTLY AS SHOWN IN THE TEMPLATE ABOVE
4. FOLLOW THE TEMPLATE STRUCTURE PRECISELY
5. COPY THE HTML STRUCTURE FROM THE TEMPLATE`;

    const result = await model.generateContent(readmePrompt);
    let readme = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!readme) {
      throw new Error("No response from AI model");
    }

    // Clean up the response by removing any markdown tags
    readme = readme
      .replace(/```md\n?/g, "") // Remove opening md tag
      .replace(/```\n?/g, "") // Remove closing tag
      .trim(); // Remove any extra whitespace

    return {
      readme,
      repomixOutput: repoContent,
    };
  } catch (error) {
    console.error("Error generating README with Vertex AI:", error);
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

export async function generateArchitectureDiagram(
  repoContent: string,
): Promise<GenerateArchitectureResponse> {
  if (USE_MOCK.ai) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      diagram: EXAMPLE_DIAGRAM,
      repomixOutput: USE_MOCK.repomix ? MOCK_REPO_CONTENT : repoContent,
    };
  }

  try {
    const diagramPrompt = `You are a software architect tasked with creating a high-level Mermaid.js diagram that visualizes the core architecture of a GitHub repository.

CRITICAL FORMATTING REQUIREMENTS:
- Structure your response in two parts:
  1. First, wrap your analysis in <thinking> tags
  2. Then, wrap your Mermaid diagram in <diagram> tags
- Inside the <thinking> tags:
  - List all major components and technologies identified
  - Explain key relationships and data flows
  - Describe any logical groupings you plan to make
- Inside the <diagram> tags:
  - Start DIRECTLY with "graph TD"
  - NO backticks or Mermaid tags
  - Just the raw Mermaid.js code

DIAGRAM CONTENT REQUIREMENTS:
- Focus ONLY on the main components and their relationships
- Keep the diagram simple and clear (max 10-15 nodes)
- Show the high-level flow, not implementation details
- Group related components into subgraphs
- Avoid showing individual functions or files

TEMPLATE RULES - YOU MUST FOLLOW THESE EXACTLY:
1. First line inside <diagram> MUST be "graph TD"
2. Node IDs:
   - ONLY use simple letters (A, B, C) or words (Frontend, Backend)
   - NO special characters, dots, or spaces in IDs
   - Example: Frontend --> Backend (CORRECT)
   - Example: frontend.api --> db (INCORRECT)
3. Node Labels:
   - ALL text with special characters MUST be in square brackets
   - Example: A[Authentication API] --> B[Database]
4. Arrows and Formatting:
   - ONLY use --> for connections
   - Each connection MUST be on its own line
   - NO multiple arrows on the same line
   - NO spaces before or after arrows
   - BAD: A --> B    C --> D
   - GOOD: A --> B
         C --> D
5. Subgraphs:
   - MUST follow this exact format:
     subgraph Name
         content
     end
   - NO variations allowed
   - Each subgraph must start on a new line

Example of correct format:
<thinking>
Components identified:
- Frontend: Next.js application
- Backend API: Express server
- Database: PostgreSQL
- Authentication: JWT-based auth service

Key relationships:
- Frontend makes API calls to backend
- Backend handles auth and data storage
- Database stores user and application data

Planned groupings:
- Frontend layer
- Backend services
- Data storage
</thinking>

<diagram>
graph TD
A[Frontend App]-->B[API Gateway]
subgraph Backend
    B-->C[Auth Service]
    C-->D[Database]
end
</diagram>

Based on the repository content, show:
1. Core system components (Frontend, Backend, Database, etc.)
2. Main data flow between components
3. Key external services and integrations
4. Logical groupings using subgraphs

HERE IS THE REPOSITORY CONTENT:

${repoContent}

Remember: Structure your response with <thinking> tags followed by <diagram> tags. Inside <diagram>, start DIRECTLY with "graph TD" - NO BACKTICKS, NO EXTRA TEXT. Make a clean diagram with max 5 nodes per component. PREFER SIMPLER DIAGRAMS. AND KEEP IT HIGH LEVEL HIGHLIGHTING THE TECHNOLOGIES, NOT INDIVIDUAL ROUTES.`;

    const result = await model.generateContent(diagramPrompt);
    const response = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!response) {
      throw new Error("No response from AI model");
    }

    // Extract just the diagram part using RegExp.exec()
    const diagramRegex = /<diagram>([\s\S]*?)<\/diagram>/;
    const diagramMatch = diagramRegex.exec(response);
    let diagram = diagramMatch?.[1]?.trim() ?? response;

    // Clean up the diagram by removing any Mermaid markdown tags
    diagram = diagram
      .replace(/```mermaid\n?/g, "") // Remove opening mermaid tag
      .replace(/```\n?/g, "") // Remove closing tag
      .trim(); // Remove any extra whitespace

    return {
      diagram,
      repomixOutput: repoContent,
    };
  } catch (error) {
    console.error("Error generating diagram with Vertex AI:", error);
    throw error;
  }
}

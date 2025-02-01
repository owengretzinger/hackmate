import { VertexAI } from '@google-cloud/vertexai';
import { env } from '../env.js';

// Flag for testing - set to true to use mock response
const USE_MOCK = true;

// Initialize Vertex with your Cloud project and location
const vertex_ai = new VertexAI({
  project: env.GOOGLE_CLOUD_PROJECT_ID,
  location: 'us-east1', // DO NOT CHANGE
});

// Select a model
const model = 'gemini-1.5-flash'; // DO NOT CHANGE

const EXAMPLE_README = `# HackMate: Your AI-Powered Hackathon Companion

## 🎯 Overview

HackMate is an intelligent assistant designed to help hackathon participants excel in their projects. It combines project analysis, documentation automation, and pitch optimization to give teams a competitive edge.

## 🚀 Key Features

### 1. Project Insight Engine

- **Scrapes and analyzes winning hackathon projects:** HackMate scours platforms like Devpost to gather data on successful projects.
- **Provides similarity analysis:** This feature helps teams validate the uniqueness of their project idea by comparing it to existing solutions.
- **Offers intelligent suggestions:** Based on successful project patterns, HackMate provides tailored recommendations to enhance project feasibility and innovation.

### 2. Documentation Autopilot

- **Generates comprehensive README files:** HackMate automatically creates well-structured README files that provide clear project context.
- **Creates automatic architecture diagrams:**  Visualize your project's structure effortlessly with automated architecture diagrams generated from your codebase.
- **Ensures clear project documentation:**  HackMate ensures your project is well-documented for judges, making it easier for them to understand your work.

### 3. Pitch Perfect Assistant

- **Analyzes pitch recordings:** HackMate analyzes your pitch recordings to identify areas for improvement.
- **Provides structured feedback:**  Receive actionable feedback on your pitch, including suggestions for clarity, flow, and impact.
- **Helps teams craft compelling project narratives:** HackMate guides teams in crafting a compelling story that effectively communicates the value of their project.

## 🛠️ Tech Stack

### Frontend

- **Next.js** with T3 Stack (create-t3-app): A powerful framework for building modern web applications with server-side rendering and static site generation.
- **TypeScript:** Ensures type safety and code maintainability.
- **Tailwind CSS:** A utility-first CSS framework for rapid and consistent styling.
- **tRPC:** Provides a type-safe way to communicate between the frontend and backend.

### Backend & Database

- **Firebase:** A comprehensive backend platform offering database, authentication, and serverless functions.
- **Firestore:** A NoSQL database for storing and managing project data.
- **Google Cloud Functions:** Serverless computing platform for running backend logic.

### AI/ML Services (Google Cloud)

- **Vertex AI:**  Google's managed machine learning platform for building and deploying AI models.
- **Speech-to-Text API:** Transcribes audio recordings for pitch analysis.
- **Natural Language API:**  Provides natural language understanding capabilities for documentation generation.

### Development Tools

- **Firebase CLI:**  Command-line interface for interacting with Firebase services.
- **Google Cloud SDK:**  Command-line tools for managing Google Cloud resources.
- **TypeScript:**  A superset of JavaScript that adds static typing.
- **ESLint & Prettier:**  Tools for code linting and formatting.

## 🌟 Why These Technologies?

- **Aligned with GDSC Mac-a-Thon requirements:**  HackMate leverages Google Cloud technologies to meet the competition's guidelines.
- **Enables rapid development with production-ready features:**  The T3 Stack and Firebase provide a robust and efficient foundation for building a feature-rich application.
- **Strong typing and developer experience:**  TypeScript and tRPC ensure type safety and a smooth development workflow.

## 🤝 Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.`;

export async function generateReadmeWithAI(repoContent: string): Promise<string> {
  if (USE_MOCK) {
    // Mock 2 second delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return EXAMPLE_README;
  }

  try {
    // Get the generative model
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: model,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.4,
        topP: 0.8,
        topK: 40,
      },
    });

    const prompt = `You are an expert technical writer tasked with creating a comprehensive README.md file for a GitHub repository.
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

    // Make the request
    const result = await generativeModel.generateContent(prompt);
    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from AI model');
    }

    return text;
  } catch (error) {
    console.error('Error generating README with Vertex AI:', error);
    throw error;
  }
} 
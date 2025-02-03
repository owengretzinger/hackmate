<div align="center">
  <a href="https://hackmate-xi.vercel.app">
    <img src="https://hackmate-xi.vercel.app/favicon.ico" alt="HackMate Logo" width="80" height="80">
  </a>

<h3 align="center">HackMate</h3>
  <p align="center">
    Your AI-powered hackathon companion
    <br />
    🏆 <a href="https://devpost.com/software/hackmate-3brfmx">1st overall @  GDG Mac-a-Thon 2025</a> 🏆 
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#demo">Demo</a></li>
      </ul>
    </li>
    <li><a href="#key-features">Key Features</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#next-steps">Next Steps</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

## About The Project

HackMate is an AI-powered hackathon companion designed to help participants excel in their projects. From idea generation to documentation and pitch creation, HackMate streamlines the hackathon experience so you can focus on your favourite part—coding.

<details>
  <summary>Problem & Solution</summary>

### Problem

Hackathons are about much more than just coding. Participants are required to:

- Come up with an idea
- Document their project and create diagrams
- Deliver a compelling pitch to judges

Despite building several cool projects at past hackathons, I haven’t won anything at a hackathon since high school, because I’m usually scrambling at the last minute to complete submissions and prepare pitches.

### Solution

HackMate solves these challenges by offering a suite of AI-driven tools:

- **Project Inspiration:** Browse winning hackathon projects to get inspired and learn from successful teams.
- **AI Documentation Generator:** Generate professional README files and architecture diagrams using AI that understands your entire codebase.
- **Pitch Assistant:** Choose from pitch templates then generate a draft.

HackMate empowers you to save time and focus on what you love—coding.

</details>

### Demo

<div align="center">
  <a href="https://youtu.be/sD66NuLWxFw">
    <img src="https://github.com/user-attachments/assets/7f512512-e7f7-4b3d-985d-378583ef389f" alt="HackMate Demo">
  </a>
  <p>
    Click the image above to watch a demo of HackMate!
  </p>
</div>

## Key Features

- **Project Inspiration:** See random real winning hackathon projects. Made possible by a web scraper I built that scrapes all information from winning projects for a given Devpost hackathon link. There are currently 264 winning projects across 15 hackathons in the database.

<img width="1624" alt="image" src="https://github.com/user-attachments/assets/65833ba0-c0f1-4e24-bd70-f189d62a4226" />

- **README Generator:** Simply enter a GitHub repository link and select a README template, then click generate. You can also give custom instructions, attach files, and edit the chosen template before submitting. In the background, the entire GitHub codebase is packed into one file that is optimized for LLM intake, and sent to Gemini alongside all the other context you provide. As a result, you will get a highly accurate README file that knows your project’s key features, installing instructions, tech stack, and more. You can then easily copy the generated file.

<img width="1624" alt="image" src="https://github.com/user-attachments/assets/9cc6eda8-af16-456c-acb1-3e1db2c9d851" />

<img width="1624" alt="image" src="https://github.com/user-attachments/assets/2483fa78-9113-443a-b5b6-85cdf5c9deaa" />

- **Architecture Diagram Generator:** Similar to the README generator, simply enter a GitHub repository link, then hit generate. Gemini will create a Mermaid.js diagram, which you can either download as an image or copy as Mermaid code, outlining the architecture of the project. Again, the diagram is highly accurate because it has access to your entire codebase.

<img width="1624" alt="image" src="https://github.com/user-attachments/assets/70fbd2c1-5fe7-4b63-ab95-c6e33cca7c7a" />

- **Pitch Assistant:** Select a pitch template, enter your project information, and get a pitch draft.

<img width="1624" alt="image" src="https://github.com/user-attachments/assets/e0e896f0-615f-427d-a840-fe40b5827483" />

- **Project Management:** Sign in with Google to save your projects and access them anywhere. From the projects dashboard, you can easily click on any generated content to view it again or make an improvement.

## Architecture

![Architecture Diagram](https://github.com/user-attachments/assets/facc9862-5d9b-4e53-a7f6-31920b3c967d)

> Created using HackMate's architecture diagram generator feature!

- **Frontend:**
  - Next.js (T3 Stack)
  - TypeScript
  - Tailwind CSS
  - Mermaid.js (architecture diagrams)
- **Backend**
  - tRPC (type-safe communication between frontend and backend)
  - Postgres Database
  - Drizzle ORM
  - Google Cloud Platform (GCP)
  - Vercel
  - Google Vertex AI with Gemini
  - Repomix (for packing GitHub repositories into a single file optimized for LLMs)
- **Authentication:**
  - NextAuth.js
  - Google Sign-In
- **Data Scraping:**
  - Puppeteer

</details>

## Next Steps

- Build AI model using scraped winning hackathon projects in order to learn patterns and give feedback on the user’s hackathon idea/project
- Further automate hackathon scraping by creating a CRON job that automatically discovers recent hackathons
- Include icons in generated architecture diagrams
- Use reasoning AI model to improve architecture diagram generation
- Ability to record your pitch and get AI feedback
- Ability to generate a pitch deck
- Further improve context provision for AI (add custom instruction options to architecture diagram generator, allow custom ignore patterns for packing repository, autofill project details for pitch based on generated README, etc.)
- ✅ Get one of my projects into the hackathon winners database 🤭

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm
- Google Cloud Platform account with a project

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/owengretzinger/hackmate.git
   ```
2. Install packages
   ```sh
   npm install
   ```
3. Configure environment variables
   ```sh
   cp .env.example .env
   ```
4. Start the development server
   ```sh
   npm run dev
   ```

## Contact

Owen Gretzinger - owengretzinger@gmail.com

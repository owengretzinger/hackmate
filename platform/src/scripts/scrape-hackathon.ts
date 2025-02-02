import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";
import superjson from "superjson";

// Ensure we're in development mode
if (process.env.NODE_ENV === "production") {
  console.error("❌ Error: This script can only be run in development mode");
  process.exit(1);
}

type Hackathon = {
  url: string;
  name: string;
};

const hackathons: Hackathon[] = [
  // {
  //   url: "https://deltahacks-xi.devpost.com",
  //   name: "DeltaHacks XI",
  // },
  // {
  //   url: "https://hack-the-valley-8.devpost.com",
  //   name: "Hack the Valley 8",
  // },
  // {
  //   url: "https://newhacks-2023.devpost.com",
  //   name: "NewHacks 2023",
  // },
  // {
  //   url: "https://hackthenorth2021.devpost.com",
  //   name: "Hack the North 2021",
  // },
  // {
  //   url: "https://hackthenorth2022.devpost.com",
  //   name: "Hack the North 2022",
  // },
  // {
  //   url: "https://hackthenorth2023.devpost.com",
  //   name: "Hack the North 2023",
  // },
  // {
  //   url: "https://hackthenorth2024.devpost.com",
  //   name: "Hack the North 2024",
  // },
  // {
  //   url: "https://mchacks-12.devpost.com",
  //   name: "McHacks 12",
  // },
  // {
  //   url: "https://qhacks-2025.devpost.com",
  //   name: "QHacks 2025",
  // },
  // {
  //   url: "https://uottahack-6.devpost.com",
  //   name: "uOttaHack 6",
  // },
  // {
  //   url: "https://nwhacks-2024.devpost.com",
  //   name: "nwHacks 2024",
  // },
  // {
  //   url: "https://hackville2025.devpost.com",
  //   name: "Hackville 2025",
  // },
  // {
  //   url: "https://newhacks-2024.devpost.com",
  //   name: "NewHacks 2024",
  // },
  // {
  //   url: "https://hackharvard-2024.devpost.com",
  //   name: "HackHarvard 2024",
  // },
  // {
  //   url: "https://hackthe6ix2024.devpost.com",
  //   name: "Hack the 6ix 2024",
  // },
];

async function main() {
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  for (const hackathon of hackathons) {
    try {
      console.log(`Starting to scrape ${hackathon.name}...`);
      const result = await client.hackathonScraper.scrapeHackathon.mutate({
        hackathonUrl: hackathon.url,
        hackathonName: hackathon.name,
        limit: 30,
      });
      console.log(`Successfully scraped ${hackathon.name}:`, result);
    } catch (error) {
      console.error(`Error scraping ${hackathon.name}:`, error);
    }
    // Add a small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main().catch(console.error);

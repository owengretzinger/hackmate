import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";
import superjson from "superjson";
import { env } from "~/env";

// Ensure we're in development mode
if (env.NODE_ENV === "production") {
  console.error("❌ Error: This script can only be run in development mode");
  process.exit(1);
}

const hackathons = [
  // {
  //   url: "https://deltahacks-xi.devpost.com",
  //   name: "DeltaHacks XI",
  // },
  {
    url: "https://hack-the-valley-8.devpost.com",
    name: "Hack the Valley 8",
  },
  {
    url: "https://newhacks-2023.devpost.com",
    name: "NewHacks 2023",
  },
  {
    url: "https://hackthenorth2021.devpost.com",
    name: "Hack the North 2021",
  },
  {
    url: "https://hackthenorth2022.devpost.com",
    name: "Hack the North 2022",
  },
  {
    url: "https://hackthenorth2023.devpost.com",
    name: "Hack the North 2023",
  },
  {
    url: "https://hackthenorth2024.devpost.com",
    name: "Hack the North 2024",
  },
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

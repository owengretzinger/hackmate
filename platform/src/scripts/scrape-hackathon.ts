import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";
import superjson from "superjson";

async function main() {
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "http://localhost:3000/api/trpc",
        transformer: superjson,
      }),
    ],
  });

  try {
    const result = await client.hackathon.scrapeHackathon.mutate({
      hackathonUrl: "https://qhacks-2025.devpost.com",
      hackathonName: "QHacks 2025",
      limit: 10,
    });

    console.log("Scraping completed:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);

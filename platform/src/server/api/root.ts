import { createTRPCRouter } from "~/server/api/trpc";
import { readmeRouter } from "./routers/readme";
import { inspirationRouter } from "./routers/inspiration";
import { pitchRouter } from "./routers/pitch";
import { createCallerFactory } from "~/server/api/trpc";
import { hackathonScraperRouter } from "./routers/hackathon-scraper";
import { userProjectsRouter } from "./routers/user-projects";
import { architectureRouter } from "~/server/api/routers/architecture";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  readme: readmeRouter,
  inspiration: inspirationRouter,
  pitch: pitchRouter,
  hackathonScraper: hackathonScraperRouter,
  userProjects: userProjectsRouter,
  architecture: architectureRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

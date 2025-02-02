import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";
import { db } from "~/server/db";
import { hackathonProjects } from "~/server/db/schema";
import { sql } from "drizzle-orm";

export const inspirationRouter = createTRPCRouter({
  getProjects: publicProcedure.query(async () => {
    return await db.query.hackathonProjects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
  }),

  getRandomProjects: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      // Using SQL's RANDOM() function to efficiently get random rows
      // Add OFFSET 0 to prevent query caching
      const randomProjects = await db.query.hackathonProjects.findMany({
        orderBy: sql`RANDOM() OFFSET 0`,
        limit: input.limit,
      });

      return randomProjects;
    }),

  getTotalProjectCount: publicProcedure.query(async () => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hackathonProjects);
    return result[0]?.count ?? 0;
  }),
});

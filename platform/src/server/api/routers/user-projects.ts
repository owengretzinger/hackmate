import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { userProjects } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userProjectsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.userProjects.findMany({
      where: eq(userProjects.userId, ctx.session.user.id),
      orderBy: [desc(userProjects.createdAt)],
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.userProjects.findFirst({
        where: eq(userProjects.id, input.id),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this project",
        });
      }

      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        githubUrl: z.string().url(),
        readme: z.string().optional(),
        architectureDiagram: z.string().optional(),
        pitchDraft: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.insert(userProjects).values({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        githubUrl: z.string().url().optional(),
        readme: z.string().optional(),
        architectureDiagram: z.string().optional(),
        pitchDraft: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const project = await ctx.db.query.userProjects.findFirst({
        where: eq(userProjects.id, id),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this project",
        });
      }

      return await ctx.db
        .update(userProjects)
        .set(updateData)
        .where(eq(userProjects.id, id));
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.query.userProjects.findFirst({
        where: eq(userProjects.id, input.id),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      if (project.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this project",
        });
      }

      return await ctx.db
        .delete(userProjects)
        .where(eq(userProjects.id, input.id));
    }),
}); 
import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";
import puppeteer from "puppeteer";
import { db } from "~/server/db";
import { hackathonProjects } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

type HackathonProject = typeof hackathonProjects.$inferInsert;

export const hackathonRouter = createTRPCRouter({
  scrapeHackathon: publicProcedure
    .input(z.object({
      hackathonUrl: z.string().url(),
      hackathonName: z.string(),
      limit: z.number().min(1).optional(),
    }))
    .mutation(async ({ input }) => {
      console.log(`🚀 Starting scrape for hackathon: ${input.hackathonName}`);
      console.log(`📍 URL: ${input.hackathonUrl}`);
      
      // Create timestamped debug directory to avoid overwriting
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const debugDir = path.join(
        process.cwd(), 
        "debug", 
        input.hackathonName.replace(/\s+/g, '-').toLowerCase(),
        timestamp
      );
      try {
        await mkdir(debugDir, { recursive: true });
        console.log(`📁 Created debug directory: ${debugDir}`);
      } catch (error) {
        console.warn("⚠️ Could not create debug directory:", error);
      }

      try {
        console.log("🌐 Launching browser...");
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox"],
        });

        try {
          console.log("📄 Creating new page...");
          const page = await browser.newPage();

          // Set a larger viewport
          await page.setViewport({ width: 1920, height: 1080 });

          // Navigate to project gallery
          const galleryUrl = `${input.hackathonUrl}/project-gallery`;
          console.log(`🎯 Navigating to project gallery: ${galleryUrl}`);
          const response = await page.goto(galleryUrl);
          
          if (!response?.ok()) {
            console.error(`❌ Failed to load page: ${response?.status()} ${response?.statusText()}`);
            // Take screenshot of error page
            await page.screenshot({ path: path.join(debugDir, 'error-page.png'), fullPage: true });
            throw new Error(`Failed to load page: ${response?.status()} ${response?.statusText()}`);
          }

          // Wait for initial content load
          console.log("⏳ Waiting for initial page load...");
          await page.waitForSelector("body");

          // Take screenshot of initial state
          console.log("📸 Taking initial screenshot...");
          await page.screenshot({ path: path.join(debugDir, 'initial-load.png'), fullPage: true });

          // Dump page content for debugging
          console.log("📝 Dumping page HTML...");
          const html = await page.content();
          await writeFile(path.join(debugDir, 'page-content.html'), html);

          // Log all available selectors on the page
          console.log("🔍 Analyzing page structure...");
          const selectors = await page.evaluate(() => {
            const getAllSelectors = (element: Element): string[] => {
              const selectors: string[] = [];
              if (element.classList.length > 0) {
                selectors.push(...Array.from(element.classList).map(c => `.${c}`));
              }
              if (element.id) {
                selectors.push(`#${element.id}`);
              }
              return selectors;
            };

            const elements = document.querySelectorAll('*');
            const allSelectors = new Set<string>();
            elements.forEach(el => {
              getAllSelectors(el).forEach(selector => allSelectors.add(selector));
            });
            return Array.from(allSelectors);
          });

          console.log("📊 Available selectors on page:", selectors);

          // Wait for projects to load
          console.log("⏳ Waiting for project elements to load...");
          await page.waitForSelector(
            ".software-entry, .gallery-item",
            { timeout: 60000 }
          );

          // Take screenshot after projects load
          console.log("📸 Taking post-load screenshot...");
          await page.screenshot({ path: path.join(debugDir, 'projects-loaded.png'), fullPage: true });

          console.log("🔍 Starting to extract project data...");
          const projects = await page.evaluate(() => {
            const entries = document.querySelectorAll('.software-entry, .gallery-item');
            console.log(`Found ${entries.length} project entries`);
            
            return Array.from(entries).map((entry) => {
              // Get basic project info
              const titleEl = entry.querySelector('h5, .software-entry-name');
              const title = titleEl?.textContent?.trim().split('\n')[0] ?? ''; // Get just the title without description
              const tagline = entry.querySelector('p, .software-entry-description')?.textContent?.trim() ?? '';
              const linkElement = entry.querySelector('a.link-to-software, a[href*="/software/"]');
              const devpostUrl = linkElement instanceof HTMLAnchorElement ? linkElement.href : "";
              const isWinner = entry.querySelector('.winner-badge, .winner, .winner-banner, [class*="winner"]') !== null;

              return {
                title,
                tagline,
                devpostUrl,
                isWinner,
              };
            });
          });

          // Deduplicate projects based on devpostUrl
          const uniqueProjects = projects.reduce((acc, project) => {
            if (project.devpostUrl && !acc.some(p => p.devpostUrl === project.devpostUrl)) {
              acc.push(project);
            }
            return acc;
          }, [] as typeof projects);

          // Filter to only winning projects and apply limit if specified
          const winningProjects = uniqueProjects
            .filter(p => p.isWinner && p.devpostUrl) // Also ensure devpostUrl exists
            .slice(0, input.limit);
          
          console.log(`🏆 Found ${winningProjects.length} winning projects to process out of ${uniqueProjects.length} total`);

          // Visit each winning project page to get detailed info
          console.log("\n📥 Fetching detailed project information...");
          let successCount = 0;
          let errorCount = 0;

          for (const project of winningProjects) {
            if (!project.devpostUrl) continue;
            
            console.log(`\n🔍 Visiting project: ${project.title}`);
            console.log(`🔗 URL: ${project.devpostUrl}`);

            // Create a new page for each project to avoid navigation history issues
            const projectPage = await browser.newPage();
            try {
              await projectPage.goto(project.devpostUrl, { waitUntil: 'networkidle0' });
              
              // Extract detailed information
              const details = await projectPage.evaluate(() => {
                // Get full description from the main content
                const fullDescription = document.querySelector('#app-details .content-section')?.textContent?.trim() ?? '';

                // Get technologies with recognition status and links
                const techNodes = document.querySelectorAll('.cp-tag, .built-with-list li');
                const technologies = Array.from(techNodes).map(node => {
                  const link = node.querySelector('a');
                  return {
                    name: node.textContent?.trim() ?? '',
                    url: link instanceof HTMLAnchorElement ? link.href : undefined,
                    isRecognized: node.classList.contains('recognized-tag')
                  };
                }).filter(tech => tech.name);

                // Get team size and members with details
                const teamNodes = document.querySelectorAll('.software-team-member');
                const teamSize = teamNodes.length;
                const teamMembers = Array.from(teamNodes).map(node => {
                  const link = node.querySelector('.user-profile-link');
                  const img = node.querySelector('img');
                  const bubble = node.querySelector('.bubble');
                  return {
                    name: link?.textContent?.trim() ?? '',
                    profileUrl: link instanceof HTMLAnchorElement ? link.href : '',
                    avatarUrl: img?.src,
                    role: bubble?.textContent?.trim()
                  };
                });

                // Get gallery images with captions
                const galleryNodes = document.querySelectorAll('#gallery .slick-slide:not(.slick-cloned) a[data-lightbox]');
                const galleryImages = Array.from(galleryNodes).map(node => ({
                  url: node.getAttribute('href') ?? '',
                  caption: node.querySelector('p i')?.textContent?.trim()
                })).filter(img => img.url);

                // Get demo video details
                const videoFrame = document.querySelector('.video-embed');
                const demoVideo = videoFrame instanceof HTMLIFrameElement ? {
                  url: videoFrame.src ?? '',
                  type: videoFrame.src?.includes('youtube') ? 'youtube' as const : 
                        videoFrame.src?.includes('vimeo') ? 'vimeo' as const : 'other' as const,
                  videoId: videoFrame.src ? new URL(videoFrame.src).searchParams.get('v') ?? undefined : undefined
                } : null;

                // Get engagement metrics
                const likeCount = parseInt(document.querySelector('.software-likes .side-count')?.textContent ?? '0', 10);
                const commentCount = parseInt(document.querySelector('.comment-button .side-count')?.textContent ?? '0', 10);
                const engagement = { likes: likeCount, comments: commentCount };

                // Get awards with prizes
                const awards = Array.from(document.querySelectorAll('.software-list-content .winner')).map(node => {
                  const label = node.textContent?.trim() ?? '';
                  const prizeText = node.nextSibling?.textContent?.trim();
                  // Get category from parent or grandparent section heading
                  const section = node.closest('section, .category-section');
                  const categoryHeading = section?.querySelector('h1, h2, h3, .category-name');
                  const category = categoryHeading?.textContent?.trim() ?? 'Overall';
                  
                  return {
                    category,
                    place: label,
                    description: null as string | null,
                    prize: prizeText ?? undefined
                  };
                });

                const githubLink = document.querySelector('a[href*="github.com"]');
                return {
                  fullDescription,
                  technologies,
                  teamSize,
                  teamMembers,
                  galleryImages,
                  demoVideo,
                  engagement,
                  awards,
                  githubUrl: githubLink instanceof HTMLAnchorElement ? githubLink.href : undefined
                };
              });

              console.log("📊 Extracted details:", details);

              const projectData: HackathonProject = {
                id: randomUUID(),
                title: project.title,
                tagline: project.tagline ?? null,
                description: details.fullDescription ?? null,
                devpostUrl: project.devpostUrl,
                thumbnail: null,
                technologies: details.technologies,
                awards: details.awards,
                demoVideo: details.demoVideo,
                teamSize: details.teamSize,
                githubUrl: details.githubUrl ?? null,
                teamMembers: details.teamMembers,
                hackathonUrl: input.hackathonUrl,
                hackathonName: input.hackathonName,
                createdAt: new Date(),
                updatedAt: new Date(),
                galleryImages: details.galleryImages,
                engagement: details.engagement
              };

              try {
                await db.insert(hackathonProjects)
                  .values(projectData)
                  .onConflictDoUpdate({
                    target: hackathonProjects.devpostUrl,
                    set: {
                      title: project.title,
                      tagline: project.tagline ?? null,
                      description: details.fullDescription ?? null,
                      technologies: details.technologies,
                      awards: details.awards,
                      galleryImages: details.galleryImages,
                      demoVideo: details.demoVideo,
                      engagement: details.engagement,
                      teamMembers: details.teamMembers,
                      updatedAt: new Date()
                    },
                  });
                console.log(`✅ Successfully stored/updated project: ${project.title}`);
                successCount++;
              } catch (error) {
                console.error(`❌ Error storing project: ${project.title}`, error);
                errorCount++;
              }
            } catch (error) {
              console.error(`❌ Error fetching details for ${project.title}:`, error);
              // Still add the project, just without the extra details
              const projectData: HackathonProject = {
                id: randomUUID(),
                title: project.title,
                tagline: project.tagline ?? null,
                description: null,
                devpostUrl: project.devpostUrl,
                thumbnail: null,
                technologies: [],
                awards: [{
                  category: 'Unknown - Error Fetching Details',
                  place: 'Winner',
                  description: null,
                  prize: undefined
                }],
                demoVideo: null,
                teamSize: null,
                githubUrl: null,
                teamMembers: [],
                hackathonUrl: input.hackathonUrl,
                hackathonName: input.hackathonName,
                createdAt: new Date(),
                updatedAt: new Date(),
                galleryImages: [],
                engagement: { likes: 0, comments: 0 }
              };

              try {
                await db.insert(hackathonProjects)
                  .values(projectData)
                  .onConflictDoUpdate({
                    target: hackathonProjects.devpostUrl,
                    set: {
                      title: project.title,
                      tagline: project.tagline ?? null,
                      description: null,
                      technologies: [],
                      awards: [{
                        category: 'Unknown - Error Fetching Details',
                        place: 'Winner',
                        description: null,
                        prize: undefined
                      }],
                      galleryImages: [],
                      demoVideo: null,
                      engagement: { likes: 0, comments: 0 },
                      teamMembers: [],
                      updatedAt: new Date()
                    },
                  });
                console.log(`✅ Successfully stored basic project info: ${project.title}`);
                successCount++;
              } catch (error) {
                console.error(`❌ Error storing project: ${project.title}`, error);
                errorCount++;
              }
            } finally {
              await projectPage.close();
            }
          }

          // Save the extracted data for debugging
          await writeFile(
            path.join(debugDir, 'extracted-data.json'), 
            JSON.stringify({
              all: projects,
              winners: winningProjects,
            }, null, 2)
          );

          // Save debug data
          await writeFile(
            path.join(debugDir, 'winning-projects.json'),
            JSON.stringify(
              winningProjects.map(p => ({
                title: p.title,
                devpostUrl: p.devpostUrl
              })),
              null,
              2
            )
          );

          console.log("\n📊 Final Statistics:");
          console.log(`✅ Successfully processed: ${successCount} projects`);
          console.log(`❌ Errors: ${errorCount} projects`);

          return {
            successCount,
            errorCount,
            debugDir
          };
        } finally {
          console.log("🔒 Closing browser...");
          await browser.close();
        }
      } catch (error) {
        console.error("❌ Fatal error scraping hackathon:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to scrape hackathon",
        });
      }
    }),

  getProjects: publicProcedure.query(async () => {
    return await db.query.hackathonProjects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
  }),
});

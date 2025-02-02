import { createTRPCRouter, publicProcedure } from "../trpc";
import { z } from "zod";
import puppeteer from "puppeteer";
import { db } from "~/server/db";
import { hackathonProjects } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { sql } from "drizzle-orm";

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

              // Get thumbnail URL
              const thumbnailImg = entry.querySelector('.software_thumbnail_image');
              const thumbnailUrl = thumbnailImg instanceof HTMLImageElement ? thumbnailImg.src : null;
              console.log(`Found thumbnail for ${title}:`, thumbnailUrl);

              return {
                title,
                tagline,
                devpostUrl,
                isWinner,
                thumbnailUrl
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
              
              // Save the project page HTML for debugging
              const pageContent = await projectPage.content();
              await writeFile(
                path.join(debugDir, `project-${project.title.replace(/[^a-z0-9]/gi, '_')}-page.html`),
                pageContent
              );
              console.log(`📝 Saved project page HTML for debugging`);

              // Extract detailed information
              const details = await projectPage.evaluate(() => {
                // Debug helper to log selector results
                const debugSelector = (selector: string, context: Element | Document = document) => {
                  const elements = context.querySelectorAll(selector);
                  console.log(`Selector "${selector}" found ${elements.length} elements`);
                  elements.forEach((el, i) => console.log(`- Element ${i + 1}:`, el.textContent?.trim()));
                  return elements;
                };

                // Define selectors that will be used for debugging info
                const descriptionSelectors = [
                  '#app-details .content-section',
                  '.app-details .content-section',
                  '.software-description',
                  '.page-content .content',
                  '.description',
                  '#software-description',
                  'div[data-section="description"]',
                  '.app-details',
                  '.content .description',
                  '.content .description-section'
                ];

                const teamMemberSelectors = [
                  '.software-team-member',
                  '.members .member',
                  '.team-members .member',
                  '.member-profile',
                  '.members li',
                  '.member'
                ];

                // Get full description - try multiple possible selectors
                debugSelector('#app-details .content-section');
                debugSelector('.app-details .content-section');
                debugSelector('.software-description');
                debugSelector('.page-content .content');
                debugSelector('.description');
                debugSelector('#software-description');

                // Get the full description from the article content - target the div between gallery and built-with
                const articleContent = document.querySelector('#app-details-left > div:not(#gallery):not(#built-with):not(.app-links)');
                let fullDescription = '';
                if (articleContent) {
                  // Get the HTML content directly to preserve formatting
                  fullDescription = articleContent.innerHTML;

                  // Clean up the HTML
                  // Remove any script tags
                  fullDescription = fullDescription.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                  // Remove any style tags
                  fullDescription = fullDescription.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
                  // Remove any class attributes
                  fullDescription = fullDescription.replace(/\sclass="[^"]*"/g, '');
                  // Remove any id attributes
                  fullDescription = fullDescription.replace(/\sid="[^"]*"/g, '');
                  // Remove any data attributes
                  fullDescription = fullDescription.replace(/\sdata-[^=]*="[^"]*"/g, '');
                  // Remove any empty paragraphs
                  fullDescription = fullDescription.replace(/<p>\s*<\/p>/g, '');
                  // Normalize whitespace but preserve newlines between elements
                  fullDescription = fullDescription.replace(/>\s+</g, '>\n<').trim();

                  console.log('Extracted formatted description:', fullDescription.slice(0, 200) + '...');
                }

                if (!fullDescription) {
                  // Fallback to previous selectors if article content not found
                  for (const selector of descriptionSelectors) {
                    const element = document.querySelector(selector);
                    if (element?.innerHTML) {
                      fullDescription = element.innerHTML;
                      console.log(`Found description using selector: ${selector}`);
                      console.log('Description preview:', fullDescription.slice(0, 100));
                      break;
                    }
                  }
                }

                // Debug description extraction
                const headingRegex = /<h\d[^>]*>(.*?)<\/h\d>/;
                const allHeadingsRegex = /<h\d[^>]*>(.*?)<\/h\d>/g;
                const firstHeadingMatch = headingRegex.exec(fullDescription);
                const allHeadings = fullDescription.match(allHeadingsRegex);

                console.log('Description extraction results:', {
                  length: fullDescription.length,
                  hasHtml: fullDescription.includes('<'),
                  firstHeading: firstHeadingMatch?.[1] ?? 'No headings found',
                  sections: allHeadings?.length ?? 0,
                  preview: fullDescription.slice(0, 500)
                });

                // Debug team member selectors
                debugSelector('.software-team-member');
                debugSelector('.user-profile-link');
                debugSelector('.members .user-profile-link');
                debugSelector('.member .user-profile-link');
                debugSelector('.member-profile');
                debugSelector('.member .user-name');
                debugSelector('.member .member-profile');

                // Get team members with enhanced details
                const teamMembers = Array.from(document.querySelectorAll('.software-team-member')).map(member => {
                  // Get name and profile URL - look for the link within the large-8 columns div
                  const profileLink = member.querySelector('.small-10.large-8.columns .user-profile-link');
                  const name = profileLink?.textContent?.trim() ?? 'Unknown Member';
                  const profileUrl = profileLink instanceof HTMLAnchorElement ? profileLink.href : '';

                  // Get role/contribution from bubble
                  const bubble = member.querySelector('.bubble p');
                  const role = bubble?.textContent?.trim();

                  // Get avatar URL - look for img within the user-photo class
                  const avatar = member.querySelector('.user-photo');
                  const avatarUrl = avatar instanceof HTMLImageElement ? avatar.src : undefined;

                  // Debug log for this member
                  console.log('Found team member:', {
                    name,
                    profileUrl,
                    role,
                    avatarUrl,
                    rawProfileLink: profileLink?.outerHTML,
                  });

                  return {
                    name,
                    profileUrl,
                    role: role ?? undefined,
                    avatarUrl: avatarUrl?.startsWith('http') ? avatarUrl : undefined
                  };
                });

                // Log all found team members for debugging
                console.log('All team members:', teamMembers);

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

                // Get awards with prizes and categories
                const awards = Array.from(document.querySelectorAll('#submissions .software-list-content .winner')).map(node => {
                  const label = node.textContent?.trim() ?? '';
                  const prizeText = node.nextSibling?.textContent?.trim();
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

                // Debug all links in the page
                console.log('Debugging all links:');
                const allLinks = document.querySelectorAll('a[href*="github.com"]');
                console.log(`Found ${allLinks.length} GitHub links on page:`);
                allLinks.forEach(link => console.log('GitHub link:', {
                  href: link.getAttribute('href'),
                  text: link.textContent,
                  html: link.outerHTML
                }));

                // Debug software-urls section
                const softwareUrls = document.querySelector('[data-role="software-urls"]');
                console.log('Software URLs section:', {
                  found: !!softwareUrls,
                  html: softwareUrls?.outerHTML
                });

                // Try multiple selectors for GitHub link
                const githubSelectors = [
                  '[data-role="software-urls"] a[href*="github.com"]',
                  '.app-links a[href*="github.com"]',
                  'a[href*="github.com"]',
                  '.app-links [title*="github.com"]',
                  'nav.app-links a[href*="github"]'
                ];

                let githubLink = null;
                for (const selector of githubSelectors) {
                  const link = document.querySelector(selector);
                  console.log(`Trying selector "${selector}":`, {
                    found: !!link,
                    href: link?.getAttribute('href'),
                    html: link?.outerHTML
                  });
                  if (link instanceof HTMLAnchorElement) {
                    githubLink = link;
                    console.log(`Found GitHub link using selector: ${selector}`);
                    break;
                  }
                }

                // Get website link from app-links section
                const websiteLink = document.querySelector('[data-role="software-urls"] a[href]:not([href*="github.com"])');
                console.log('Found website link:', websiteLink?.getAttribute('href'));

                return {
                  fullDescription,
                  technologies,
                  teamSize: teamMembers.length,
                  teamMembers,
                  galleryImages,
                  demoVideo,
                  engagement,
                  awards,
                  githubUrl: githubLink?.href ?? null,
                  websiteUrl: websiteLink instanceof HTMLAnchorElement ? websiteLink.href : null,
                  debugInfo: {
                    descriptionLength: fullDescription.length,
                    teamMembersFound: teamMembers.length,
                    selectors: {
                      description: descriptionSelectors,
                      teamMembers: teamMemberSelectors
                    }
                  }
                };
              });

              // Enhanced debug logging
              console.log("\n🔍 Extracted Details Summary:");
              console.log(`📝 Description length: ${details.fullDescription?.length ?? 0} characters`);
              console.log(`👥 Team members found: ${details.teamMembers.length}`);
              console.log(`🏷️ Technologies found: ${details.technologies.length}`);
              console.log(`🖼️ Gallery images found: ${details.galleryImages.length}`);
              console.log(`🏆 Awards found: ${details.awards.length}`);
              
              // Save detailed debug info for this project
              await writeFile(
                path.join(debugDir, `project-${project.title.replace(/[^a-z0-9]/gi, '_')}.json`),
                JSON.stringify({
                  title: project.title,
                  devpostUrl: project.devpostUrl,
                  extractedDetails: details,
                  debugInfo: details.debugInfo
                }, null, 2)
              );

              const projectData: HackathonProject = {
                id: randomUUID(),
                title: project.title,
                tagline: project.tagline ?? null,
                description: details.fullDescription ?? null,
                devpostUrl: project.devpostUrl,
                thumbnail: project.thumbnailUrl,
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
                engagement: details.engagement,
                websiteUrl: details.websiteUrl ?? null
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
                      teamSize: details.teamSize,
                      githubUrl: details.githubUrl,
                      websiteUrl: details.websiteUrl,
                      thumbnail: project.thumbnailUrl,
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
                thumbnail: project.thumbnailUrl,
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
                websiteUrl: null,
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

  getRandomProjects: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ input }) => {
      // Using SQL's RANDOM() function to efficiently get random rows
      // Add OFFSET 0 to prevent query caching
      const randomProjects = await db.query.hackathonProjects.findMany({
        orderBy: sql`RANDOM() OFFSET 0`,
        limit: input.limit,
      });

      return randomProjects;
    }),

  getTotalProjectCount: publicProcedure
    .query(async () => {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(hackathonProjects);
      return result[0]?.count ?? 0;
    }),
});

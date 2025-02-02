"use client";

import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Github, Heart, MessageCircle, Youtube, ChevronDown, ChevronUp, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function InspirationPage() {
  const { data: projects, isLoading, refetch } = api.hackathon.getRandomProjects.useQuery(
    { limit: 10 },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  );
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number>(0);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (projects?.length) {
      // Set initial project to first one since they're already random
      setCurrentProjectIndex(0);
    }
  }, [projects]);

  useEffect(() => {
    // Handle spacebar press to fetch new random projects
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && projects?.length) {
        e.preventDefault(); // Prevent page scroll
        void refetch(); // Fetch new random projects
        setCurrentProjectIndex(0); // Reset to first project
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [projects, refetch]);

  const handleNextProject = () => {
    if (projects?.length) {
      if (currentProjectIndex === projects.length - 1) {
        void refetch(); // If we're at the end, fetch new random projects
        setCurrentProjectIndex(0);
      } else {
        setCurrentProjectIndex(prev => prev + 1); // Otherwise go to next project
      }
    }
  };

  const toggleDescription = (projectId: string) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Projects Found</CardTitle>
            <CardDescription>
              Try scraping some hackathon projects first!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentProject = projects[currentProjectIndex]!;

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <Card className="w-full">
          <CardHeader>
            <div className="w-full space-y-3">
              <div className="flex w-full justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="text-2xl">
                    {currentProject.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    {currentProject.demoVideo && (
                      <Link href={currentProject.demoVideo.url} target="_blank">
                        <Button variant="outline" size="icon">
                          <Youtube className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Link href={currentProject.devpostUrl} target="_blank">
                      <Button variant="outline" size="icon">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 fill-current"
                        >
                          <path d="M6.002 1.61 0 12.004 6.002 22.39h11.996L24 12.004 17.998 1.61zm1.593 4.084h3.947c3.605 0 6.276 1.695 6.276 6.31 0 4.436-3.21 6.302-6.456 6.302H7.595zm2.517 2.449v7.714h1.241c2.646 0 3.862-1.55 3.862-3.861.009-2.569-1.096-3.853-3.767-3.853z" />
                        </svg>
                      </Button>
                    </Link>
                    {currentProject.githubUrl && (
                      <Link href={currentProject.githubUrl} target="_blank">
                        <Button variant="outline" size="icon">
                          <Github className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {currentProject.websiteUrl && (
                      <Link href={currentProject.websiteUrl} target="_blank">
                        <Button variant="outline" size="icon">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                          </svg>
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">
                        {currentProject.engagement.likes}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {currentProject.engagement.comments}
                    </span>
                  </div>
                </div>
              </div>
              {/* Team */}
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-3">
                  {currentProject.teamMembers.map((member, i) => (
                    <Link
                      key={i}
                      href={member.profileUrl}
                      target="_blank"
                      className="group flex items-center gap-2 hover:opacity-80"
                    >
                      {member.avatarUrl ? (
                        <div className="relative h-6 w-6 overflow-hidden rounded-full">
                          <Image
                            src={member.avatarUrl}
                            alt={member.name || "Team member"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted" />
                      )}
                      <span className="text-xs group-hover:underline">
                        {member.name || "Anonymous"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
              <CardDescription className="text-base">
                {currentProject.tagline}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-2">
                {currentProject.awards.map((award, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    🏆 {award.place}
                    {award.prize && (
                      <span className="text-muted-foreground">
                        {" "}
                        - {award.prize}
                      </span>
                    )}
                  </Badge>
                ))}
                <Link
                  href={currentProject.hackathonUrl}
                  target="_blank"
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  @ {currentProject.hackathonName}
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            {/* Gallery */}
            {(currentProject.galleryImages.length > 0 || currentProject.thumbnail) && (
              <div className="grid grid-cols-2 gap-4">
                {/* Main Image - either first gallery image or thumbnail */}
                <div className="col-span-2 relative aspect-video overflow-hidden rounded-lg">
                  <Image
                    src={currentProject.galleryImages[0]?.url ?? currentProject.thumbnail ?? ''}
                    alt={`${currentProject.title} - Main Image`}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Additional Gallery Images */}
                {currentProject.galleryImages.slice(1, 3).map((image, index) => (
                  <div key={index} className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src={image.url}
                      alt={`${currentProject.title} - Gallery Image ${index + 2}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
                
                {/* Show remaining count if there are more images */}
                {currentProject.galleryImages.length > 3 && (
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src={currentProject.galleryImages[3]!.url}
                      alt={`${currentProject.title} - Gallery Image 4`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-lg font-medium text-white">
                        +{currentProject.galleryImages.length - 3} more
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Technologies */}
            <div className="flex flex-wrap gap-2">
              {currentProject.technologies.map((tech) => (
                <Badge
                  key={tech.name}
                  variant="secondary"
                  className={tech.isRecognized ? "" : "opacity-70"}
                >
                  {tech.name}
                </Badge>
              ))}
            </div>

            {/* Description */}
            {currentProject.description && (
              <div className="space-y-4">
                <div
                  className={`prose prose-sm max-w-none text-muted-foreground dark:prose-invert [&_a:hover]:opacity-80 [&_a]:text-primary [&_a]:underline [&_em]:italic [&_h2]:mb-4 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mb-4 [&_strong]:text-foreground ${
                    !expandedDescriptions[currentProject.id] && "line-clamp-3"
                  }`}
                  dangerouslySetInnerHTML={{ __html: currentProject.description }}
                />
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => toggleDescription(currentProject.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedDescriptions[currentProject.id] ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show More
                      </>
                    )}
                  </div>
                </Button>
              </div>
            )}

            {/* Last Updated */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Retrieved {currentProject.updatedAt 
                  ? formatDistanceToNow(new Date(currentProject.updatedAt), { addSuffix: true })
                  : 'unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleNextProject} className="gap-2">
            Next Project
            <span className="rounded border px-2 py-0.5 text-xs">Space</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

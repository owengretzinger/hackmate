"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  Github,
  Heart,
  MessageCircle,
  Youtube,
  ChevronDown,
  ChevronUp,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

export default function InspirationPage() {
  const {
    data: projects,
    isLoading,
    refetch,
  } = api.inspiration.getRandomProjects.useQuery(
    { limit: 10 },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      trpc: {
        context: {
          skipBatch: true, // Prevent batching of queries
        },
      },
    },
  );
  const { data: totalProjects } = api.inspiration.getTotalProjectCount.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  );
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number>(0);
  const [viewedProjectCount, setViewedProjectCount] = useState<number>(1);
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newProjectsReady, setNewProjectsReady] = useState<typeof projects | undefined>(undefined);

  useEffect(() => {
    // Only set initial project index on first mount
    if (!projects?.length) return;
    
    // If we have new projects ready and we're at the end of current projects
    if (newProjectsReady && currentProjectIndex === projects.length - 1) {
      setCurrentProjectIndex(0);
      setNewProjectsReady(undefined);
    }
  }, [projects, currentProjectIndex, newProjectsReady]);

  useEffect(() => {
    // Handle spacebar press to fetch new random projects
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && projects?.length) {
        e.preventDefault(); // Prevent page scroll
        if (currentProjectIndex === projects.length - 1) {
          void refetch().then((result) => {
            if (result.data) setNewProjectsReady(result.data);
          });
          // Don't reset index yet - wait for user to press space again
        } else {
          setCurrentProjectIndex((prev) => prev + 1);
        }
        setViewedProjectCount((count) => count + 1);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [projects, refetch, currentProjectIndex]);

  const handleNextProject = () => {
    if (projects?.length) {
      if (currentProjectIndex === projects.length - 1) {
        void refetch().then((result) => {
          if (result.data) setNewProjectsReady(result.data);
        });
        // Don't reset index yet - wait for next click
      } else {
        setCurrentProjectIndex((prev) => prev + 1);
      }
      setViewedProjectCount((count) => count + 1);
    }
  };

  const toggleDescription = (projectId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const handleNextImage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const currentProject = projects?.[currentProjectIndex];
      if (!currentProject) return;
      const totalImages = currentProject.galleryImages.length;
      setCurrentImageIndex((prev) => (prev + 1) % totalImages);
    },
    [projects, currentProjectIndex],
  );

  const handlePrevImage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const currentProject = projects?.[currentProjectIndex];
      if (!currentProject) return;
      const totalImages = currentProject.galleryImages.length;
      setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages);
    },
    [projects, currentProjectIndex],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!modalOpen) return;
      if (e.key === "ArrowRight") handleNextImage();
      if (e.key === "ArrowLeft") handlePrevImage();
    },
    [modalOpen, handleNextImage, handlePrevImage],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, handleKeyDown]);

  // Reset image index when project changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setModalOpen(false);
  }, [currentProjectIndex]);

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
                      href={member.profileUrl ?? "#"}
                      target="_blank"
                      onClick={(e) => !member.profileUrl && e.preventDefault()}
                      className={`group flex items-center gap-2 ${member.profileUrl ? "hover:opacity-80" : "cursor-default"}`}
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
                      <span
                        className={`text-xs ${member.profileUrl ? "group-hover:underline" : "text-muted-foreground"}`}
                      >
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
            {(currentProject.galleryImages.length > 0 ||
              currentProject.thumbnail) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Main Image - either first gallery image or thumbnail */}
                  <div
                    className="relative col-span-2 aspect-video cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-95"
                    onClick={() => {
                      setCurrentImageIndex(0);
                      setModalOpen(true);
                    }}
                  >
                    <Image
                      src={
                        currentProject.galleryImages[0]?.url ??
                        currentProject.thumbnail ??
                        ""
                      }
                      alt={`${currentProject.title} - Main Image`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Additional Gallery Images */}
                  {currentProject.galleryImages
                    .slice(1, 2)
                    .map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-video cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-95"
                        onClick={() => {
                          setCurrentImageIndex(index + 1);
                          setModalOpen(true);
                        }}
                      >
                        <Image
                          src={image.url}
                          alt={`${currentProject.title} - Gallery Image ${index + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}

                  {/* Show remaining count if there are more images */}
                  {currentProject.galleryImages.length > 2 &&
                    currentProject.galleryImages[2] && (
                      <div
                        className="relative aspect-video cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-95"
                        onClick={() => {
                          setCurrentImageIndex(2);
                          setModalOpen(true);
                        }}
                      >
                        <Image
                          src={currentProject.galleryImages[2].url}
                          alt={`${currentProject.title} - Gallery Image 3`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-lg font-medium text-white">
                            +{currentProject.galleryImages.length - 2} more
                          </span>
                        </div>
                      </div>
                    )}
                </div>

                {/* Image Modal */}
                <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                  <DialogContent className="max-h-[95vh] max-w-[95vw] overflow-hidden border-none bg-transparent p-0">
                    <DialogTitle className="sr-only">
                      {currentProject.title} - Image Gallery
                    </DialogTitle>
                    <div className="relative h-full min-h-[80vh] w-full rounded-lg bg-black/90">
                      {/* Navigation buttons */}
                      {currentProject.galleryImages.length > 1 && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-4 top-1/2 z-50 -translate-y-1/2 text-white hover:bg-white/20"
                            onClick={handlePrevImage}
                          >
                            <ChevronLeft className="h-8 w-8" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-1/2 z-50 -translate-y-1/2 text-white hover:bg-white/20"
                            onClick={handleNextImage}
                          >
                            <ChevronRight className="h-8 w-8" />
                          </Button>
                        </>
                      )}

                      {/* Current image */}
                      <div className="relative flex h-full w-full items-center justify-center p-4">
                        <div className="relative h-full w-full">
                          <Image
                            src={
                              currentProject.galleryImages[currentImageIndex]
                                ?.url ??
                              currentProject.thumbnail ??
                              ""
                            }
                            alt={`${currentProject.title} - Gallery Image ${currentImageIndex + 1}`}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>

                      {/* Image counter */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                        {currentImageIndex + 1} /{" "}
                        {currentProject.galleryImages.length}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
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
                  dangerouslySetInnerHTML={{
                    __html: currentProject.description,
                  }}
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  Retrieved{" "}
                  {currentProject.updatedAt
                    ? formatDistanceToNow(new Date(currentProject.updatedAt), {
                        addSuffix: true,
                      })
                    : "unknown"}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span>
                  Project {viewedProjectCount}/
                  {totalProjects?.toLocaleString() ?? "..."}
                </span>
              </div>
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

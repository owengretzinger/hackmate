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
import { Github, Heart, MessageCircle, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function InspirationPage() {
  const { data: projects, isLoading } = api.hackathon.getProjects.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  );
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number>(0);

  useEffect(() => {
    if (projects?.length) {
      // Set initial random project
      setCurrentProjectIndex(Math.floor(Math.random() * projects.length));
    }
  }, [projects]);

  useEffect(() => {
    // Handle spacebar press
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && projects?.length) {
        e.preventDefault(); // Prevent page scroll
        setCurrentProjectIndex(Math.floor(Math.random() * projects.length));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [projects]);

  const handleNextProject = () => {
    if (projects?.length) {
      setCurrentProjectIndex(Math.floor(Math.random() * projects.length));
    }
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
            {currentProject.galleryImages[0]?.url && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg">
                <Image
                  src={currentProject.galleryImages[0].url}
                  alt={currentProject.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Description */}
            {currentProject.description && (
              <p className="text-muted-foreground">
                {currentProject.description}
              </p>
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

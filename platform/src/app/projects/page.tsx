"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const projectFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  githubUrl: z.string().url("Must be a valid URL"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{
    id: string;
    name: string;
    githubUrl: string;
  } | null>(null);
  const { toast } = useToast();

  const utils = api.useUtils();
  const { data: projects, isLoading: isLoadingProjects } = api.userProjects.getAll.useQuery();

  const createProject = api.userProjects.create.useMutation({
    onSuccess: () => {
      toast({ description: "Project created successfully" });
      setIsCreateDialogOpen(false);
      void utils.userProjects.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  const updateProject = api.userProjects.update.useMutation({
    onSuccess: () => {
      toast({ description: "Project updated successfully" });
      setEditingProject(null);
      void utils.userProjects.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  const deleteProject = api.userProjects.delete.useMutation({
    onSuccess: () => {
      toast({ description: "Project deleted successfully" });
      void utils.userProjects.getAll.invalidate();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: error.message,
      });
    },
  });

  const createForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      githubUrl: "",
    },
  });

  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: editingProject?.name ?? "",
      githubUrl: editingProject?.githubUrl ?? "",
    },
  });

  // Reset edit form when editing project changes
  useEffect(() => {
    if (editingProject) {
      editForm.reset({
        name: editingProject.name,
        githubUrl: editingProject.githubUrl,
      });
    }
  }, [editingProject, editForm]);

  const onCreateSubmit = (values: ProjectFormValues) => {
    createProject.mutate(values);
    createForm.reset();
  };

  const onEditSubmit = (values: ProjectFormValues) => {
    if (!editingProject) return;
    updateProject.mutate({
      id: editingProject.id,
      ...values,
    });
    editForm.reset();
  };

  return (
    <>
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Projects</CardTitle>
                <CardDescription>
                  Manage your projects and their generated content
                </CardDescription>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Project</DialogTitle>
                    <DialogDescription>
                      Add a new project to generate documentation and pitch content for
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Name</FormLabel>
                            <FormControl>
                              <Input placeholder="My Awesome Project" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="githubUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GitHub URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://github.com/user/repo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createProject.isPending}>
                          {createProject.isPending ? "Creating..." : "Create Project"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingProjects ? (
              <div>Loading...</div>
            ) : !projects?.length ? (
              <div className="text-center text-muted-foreground">
                No projects yet. Add one to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-xl">{project.name}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Link
                              href={project.githubUrl}
                              target="_blank"
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              GitHub
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                            <span>•</span>
                            <span>
                              Created{" "}
                              {format(new Date(project.createdAt!), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog
                            open={editingProject?.id === project.id}
                            onOpenChange={(open) =>
                              setEditingProject(
                                open ? { ...project } : null,
                              )
                            }
                          >
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Project</DialogTitle>
                                <DialogDescription>
                                  Update your project details
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...editForm}>
                                <form
                                  onSubmit={editForm.handleSubmit(onEditSubmit)}
                                  className="space-y-4"
                                >
                                  <FormField
                                    control={editForm.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Project Name</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={editForm.control}
                                    name="githubUrl"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>GitHub URL</FormLabel>
                                        <FormControl>
                                          <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <DialogFooter>
                                    <Button
                                      type="submit"
                                      disabled={updateProject.isPending}
                                    >
                                      {updateProject.isPending
                                        ? "Saving..."
                                        : "Save Changes"}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this project?",
                                )
                              ) {
                                deleteProject.mutate({ id: project.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <Link
                          href={`/documentation?projectId=${project.id}`}
                          className="group block space-y-2 rounded-lg border p-4 hover:border-foreground"
                        >
                          <h3 className="font-medium group-hover:underline">
                            Documentation
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {project.readme
                              ? "View generated documentation"
                              : "Generate documentation"}
                          </p>
                        </Link>
                        <Link
                          href={`/pitch?projectId=${project.id}`}
                          className="group block space-y-2 rounded-lg border p-4 hover:border-foreground"
                        >
                          <h3 className="font-medium group-hover:underline">
                            Pitch
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {project.pitchDraft
                              ? "View generated pitch"
                              : "Generate pitch"}
                          </p>
                        </Link>
                        <div className="space-y-2 rounded-lg border p-4">
                          <h3 className="font-medium">Architecture</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.architectureDiagram
                              ? "View architecture diagram"
                              : "Generate architecture diagram"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </>
  );
} 
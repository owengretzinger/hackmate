"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";
import { ChevronDown, ChevronUp } from "lucide-react";

const formSchema = z.object({
  repoUrl: z.string().url("Please enter a valid URL"),
});

export default function ReadmePage() {
  const [generatedReadme, setGeneratedReadme] = useState<string | null>(null);
  const [repomixOutput, setRepomixOutput] = useState<string | null>(null);
  const [showRepomixOutput, setShowRepomixOutput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repoUrl: "",
    },
  });

  const generateReadme = api.readme.generateReadme.useMutation({
    onSuccess: (data) => {
      if (!data.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error,
        });
        setGeneratedReadme(null);
        setRepomixOutput(null);
      } else {
        toast({
          description: "README generated successfully!",
        });
        setGeneratedReadme(data.readme);
        setRepomixOutput(data.repomixOutput);
      }
      setIsLoading(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to server. Please try again.",
      });
      setIsLoading(false);
      setGeneratedReadme(null);
      setRepomixOutput(null);
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setGeneratedReadme(null);
    setRepomixOutput(null);
    setShowRepomixOutput(false);
    await generateReadme.mutateAsync(values);
  }

  return (
    <>
      <div className="container mx-auto py-10">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>README Generator</CardTitle>
            <CardDescription>
              Enter a public GitHub repository URL to generate a README file
              using AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <FormField
                  control={form.control}
                  name="repoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://github.com/user/repo"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Generating..." : "Generate README"}
                </Button>
              </form>
            </Form>

            {generatedReadme && (
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-semibold">
                    Generated README:
                  </h3>
                  <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4">
                    {generatedReadme}
                  </pre>
                </div>

                {repomixOutput && (
                  <div>
                    <Button
                      variant="outline"
                      className="mb-4 w-full"
                      onClick={() => setShowRepomixOutput(!showRepomixOutput)}
                    >
                      {showRepomixOutput ? (
                        <ChevronUp className="mr-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="mr-2 h-4 w-4" />
                      )}
                      {showRepomixOutput ? "Hide" : "Show"} Repomix Output
                    </Button>
                    {showRepomixOutput && (
                      <div className="rounded-lg border p-4">
                        <pre className="whitespace-pre-wrap text-sm">
                          {repomixOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </>
  );
}

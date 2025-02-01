import Link from "next/link";

import { ThemeToggle } from "~/components/theme-toggle";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col">
        <nav className="border-b w-full">
          <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
            <Link href="/" className="font-bold">
              HackMate
            </Link>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link
                href={session ? "/signout" : "/signin"}
                className="text-sm font-medium hover:underline"
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
            </div>
          </div>
        </nav>
        <div className="mx-auto max-w-7xl flex-1 px-4 py-8 w-full">
          {session?.user ? (
            <p>Welcome back, {session.user.name}!</p>
          ) : (
            <p>Please sign in to continue.</p>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}

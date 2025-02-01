import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="container py-8">
        {session?.user ? (
          <p>Welcome back, {session.user.name}!</p>
        ) : (
          <p>Please sign in to continue.</p>
        )}
      </main>
    </HydrateClient>
  );
}

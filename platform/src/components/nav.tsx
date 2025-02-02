import Link from "next/link";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { auth, signOut } from "~/server/auth";

export async function Nav() {
  const session = await auth();

  return (
    <nav className="border-b w-full">
      <div className="mx-auto max-w-7xl container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">HackMate</span>
          </Link>
          <div className="flex items-center text-sm font-medium">
            <Link href="/inspiration">
              <Button variant="ghost">Inspiration</Button>
            </Link>
            <Link href="/documentation  ">
              <Button variant="ghost">Documentation Generator</Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button variant="ghost" type="submit">Sign out</Button>
            </form>
          ) : (
            <Link href="/signin">
              <Button variant="ghost">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 
import Link from "next/link";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { auth, signOut } from "~/server/auth";

const links = [
  {
    href: "/projects",
    label: "Projects",
  },
  {
    href: "/inspiration",
    label: "Inspiration",
  },
  {
    href: "/documentation",
    label: "Documentation",
  },
  {
    href: "/pitch",
    label: "Pitch",
  },
];

export async function Nav() {
  const session = await auth();

  return (
    <nav className="w-full border-b">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">HackMate</span>
          </Link>
          <div className="flex items-center text-sm font-medium">
            {links.map((link) => (
              <Link href={link.href} key={link.href}>
                <Button variant="ghost">{link.label}</Button>
              </Link>
            ))}
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
              <Button variant="ghost" type="submit">
                Sign out
              </Button>
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

import Link from "next/link";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { auth, signOut } from "~/server/auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const links = [
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
        <div className="flex items-center">
          <ThemeToggle />
          <Link href={session?.user ? "/projects" : "/signin"}>
            <Button variant="ghost">My Projects</Button>
          </Link>
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                variant="ghost"
                type="submit"
                className="flex items-center gap-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={session.user.image ?? undefined}
                    alt={session.user.name ?? "User"}
                  />
                  <AvatarFallback>
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
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

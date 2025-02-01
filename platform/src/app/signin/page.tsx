import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "~/components/ui/button";
import { auth, signIn } from "~/server/auth";

export default async function SignInPage() {
  const session = await auth();
  
  if (session?.user) {
    redirect("/");
  }

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto flex max-w-[350px] flex-col items-center justify-center space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to HackMate
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to continue to the platform
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <form action={handleSignIn}>
            <Button type="submit" className="w-full flex items-center justify-center gap-2">
              <Image src="/google.svg" alt="Google" width={16} height={16} />
              Sign in with Google
            </Button>
          </form>
          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 
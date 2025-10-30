import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-6 py-8 sm:py-10">
        <div className="flex flex-col items-center gap-4 px-4 sm:px-8">
          <Logo />
          <p className="text-center text-sm leading-loose text-muted-foreground max-w-md">
            Built by your friendly neighborhood AI. Discover and purchase unique, high-quality images from talented photographers around the world.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="#" className="text-sm font-medium hover:text-primary">Terms of Service</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary">Privacy Policy</Link>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} EVYKA Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

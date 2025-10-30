import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-6 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Logo />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by your friendly neighborhood AI.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="#" className="text-sm font-medium hover:text-primary">Terms of Service</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary">Privacy Policy</Link>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} FocusFinds Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

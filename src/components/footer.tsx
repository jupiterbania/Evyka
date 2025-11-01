
import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center gap-6 py-8 sm:py-10">
        <div className="flex flex-col items-center gap-4 px-4 sm:px-8">
          <Logo />
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/privacy-policy" className="text-sm font-medium hover:text-primary">Privacy Policy</Link>
          <Link href="https://www.instagram.com/heyevyka" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">Contact Us</Link>
          <Link href="https://www.effectivegatecpm.com/zfpu3dtsu?key=f16f8220857452f455eed8c64dfabf18" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary">Sponsored Link</Link>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} EVYKA Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';
import { Menu, Search } from 'lucide-react';
import { Input } from './ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex-1 flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="py-4">
                <Logo />
              </div>
              <nav className="grid gap-4 py-4">
                <Link href="/" className="text-lg font-semibold hover:text-primary">Home</Link>
                <Link href="/#gallery" className="text-lg font-semibold hover:text-primary">Gallery</Link>
                <Link href="/admin" className="text-lg font-semibold hover:text-primary">Admin</Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center justify-center">
           <Logo />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
             <Button>Sign In</Button>
        </div>
      </div>
    </header>
  );
}

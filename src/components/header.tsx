import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Menu, Search } from 'lucide-react';
import { Input } from './ui/input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>
        <div className="flex md:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
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
        <div className="flex-1 hidden md:flex items-center gap-4">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <Link href="/#gallery" className="hover:text-primary transition-colors">Gallery</Link>
            <Link href="/admin" className="hover:text-primary transition-colors">Admin</Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <form>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                  />
                </div>
              </form>
            </div>
             <Button>Sign In</Button>
        </div>
      </div>
    </header>
  );
}

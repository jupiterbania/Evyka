'use client';
import Link from 'next/link';
import { Logo } from './logo';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Menu, LayoutGrid, Image as ImageIcon, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function AdminHeader() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/images', label: 'Images', icon: ImageIcon },
  ];

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
              <div className="py-4">
                <Logo />
              </div>
              <nav className="grid gap-2 py-4">
                {menuItems.map((item) => (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={`flex items-center gap-2 rounded-md p-2 text-lg font-semibold hover:bg-accent ${pathname === item.href ? 'bg-accent' : ''}`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
                 <Link
                    href="/"
                    className={`flex items-center gap-2 rounded-md p-2 text-lg font-semibold hover:bg-accent`}
                  >
                    <Home className="h-5 w-5" />
                    Back to Site
                  </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex items-center justify-center">
          <Logo />
        </div>
        <div className="flex-1" />
      </div>
    </header>
  );
}



'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Home, Video, User, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const [isAgeGateOpen, setAgeGateOpen] = useState(false);
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  
  const filter = searchParams.get('filter');
  const isNudeActive = pathname === '/' && filter === 'nude';
  const isFeedActive = pathname === '/' && !isNudeActive;

  const handleNudesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAgeConfirmed) {
      router.push('/?filter=nude');
    } else {
      setAgeGateOpen(true);
    }
  };

  const handleAgeConfirm = () => {
    setIsAgeConfirmed(true);
    setAgeGateOpen(false);
    router.push('/?filter=nude');
  };

  const handleAgeCancel = () => {
    setAgeGateOpen(false);
    // If they were trying to go to nudes but cancelled, send them back to images
    if (isNudeActive) {
      router.push('/');
    }
  };

  const navItems = [
    {
      href: '/',
      label: 'Feed',
      icon: Home,
      isActive: isFeedActive,
    },
    {
      href: '/reels',
      label: 'Reels',
      icon: Video,
      isActive: pathname === '/reels',
    },
    {
      href: '/?filter=nude',
      label: '18+',
      icon: AlertTriangle,
      isActive: isNudeActive,
      onClick: handleNudesClick,
      className: 'text-accent hover:text-accent focus:text-accent',
      activeClassName: '!text-accent-foreground bg-accent',
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: User,
      isActive: pathname === '/profile',
    },
  ];

  if (!user || pathname === '/reels') return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 z-50 w-full h-14 bg-background border-t border-border">
        <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
          {navItems.map((item) => (
            <Link
              href={item.href}
              key={item.label}
              onClick={item.onClick}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
                item.className,
                item.isActive && (item.activeClassName || 'bg-muted text-primary'),
              )}
            >
              <item.icon className={cn('w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary', item.isActive && 'text-primary', item.activeClassName && item.isActive && '!text-accent-foreground' )} />
              <span className={cn('text-sm text-muted-foreground group-hover:text-primary', item.isActive && 'text-primary', item.activeClassName && item.isActive && '!text-accent-foreground')}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
      <AlertDialog open={isAgeGateOpen} onOpenChange={setAgeGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Age Verification</AlertDialogTitle>
            <AlertDialogDescription>
              You must be 18 years or older to view this content. Please confirm your age.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAgeCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAgeConfirm}>
              Yes, I am 18+
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

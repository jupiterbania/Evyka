import { Camera } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="EVYKA homepage">
      <Camera className="h-6 w-6 text-primary" />
      <span className="text-xl font-bold font-headline text-foreground">EVYKA</span>
    </Link>
  );
}

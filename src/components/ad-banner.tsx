'use client';
import { useUser } from '@/firebase';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import Script from 'next/script';

export function AdBanner() {
  const { user } = useUser();
  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  if (isAdmin) {
    return null; // Don't render ad for admin
  }

  return (
    <Card 
        className={cn(
          "group overflow-hidden flex flex-col items-center justify-center p-2",
          "opacity-0 animate-fade-in-up aspect-[3/4]"
        )}
        style={{ animationDelay: '200ms' }}
    >
        <div className="flex flex-col justify-center items-center w-full h-full">
            <Script id="ad-banner-script" strategy="afterInteractive">
                {`
                    atOptions = {
                        'key' : '1aa94d7450572033bf4e3ce4bf8efaa7',
                        'format' : 'iframe',
                        'height' : 250,
                        'width' : 300,
                        'params' : {}
                    };
                `}
            </Script>
            <Script 
                src="//www.highperformanceformat.com/1aa94d7450572033bf4e3ce4bf8efaa7/invoke.js" 
                strategy="afterInteractive" 
            />
        </div>
    </Card>
  );
}

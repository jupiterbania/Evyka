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
          "opacity-0 animate-fade-in-up"
        )}
        style={{ animationDelay: '200ms' }}
    >
        <div className="flex flex-col justify-center items-center w-full h-full">
            <Script id="ad-banner-script" strategy="afterInteractive">
                {`
                    atOptions = {
                        'key' : '20b08575a703d154fae0b8214f4a4759',
                        'format' : 'iframe',
                        'height' : 300,
                        'width' : 160,
                        'params' : {}
                    };
                `}
            </Script>
            <Script 
                src="//www.topcreativeformat.com/20b08575a703d154fae0b8214f4a4759/invoke.js" 
                strategy="afterInteractive" 
            />
        </div>
    </Card>
  );
}

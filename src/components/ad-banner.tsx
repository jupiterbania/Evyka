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
            <Script 
                id="ad-banner-script"
                strategy="afterInteractive"
            >
                {`
                    atOptions = {
                        'key' : '5f4d99dc5499dc62c5353fdfdfe2e35f',
                        'format' : 'iframe',
                        'height' : 300,
                        'width' : 160,
                        'params' : {}
                    };
                    try {
                        const container = document.getElementById('container-5f4d99dc5499dc62c5353fdfdfe2e35f');
                        if (container) {
                            const script = document.createElement('script');
                            script.async = true;
                            script.src = '//www.effectivecreativeformat.com/5f4d99dc5499dc62c5353fdfdfe2e35f/invoke.js';
                            container.appendChild(script);
                        }
                    } catch (e) {
                        console.error('Ad script error:', e);
                    }
                `}
            </Script>
            <div id="container-5f4d99dc5499dc62c5353fdfdfe2e35f"></div>
        </div>
    </Card>
  );
}

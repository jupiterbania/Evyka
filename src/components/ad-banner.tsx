'use client';
import { useUser } from '@/firebase';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import Script from 'next/script';
import { useEffect, useId } from 'react';

export function AdBanner() {
  const { user } = useUser();
  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;
  const uniqueId = useId().replace(/:/g, ''); // Create a unique ID for each ad instance

  useEffect(() => {
    if (isAdmin) return;
    
    // Ad invocation options
    const atOptions = {
        'key' : '5f4d99dc5499dc62c5353fdfdfe2e35f',
        'format' : 'iframe',
        'height' : 300,
        'width' : 160,
        'params' : {}
    };

    try {
        const container = document.getElementById(`container-${uniqueId}`);
        if (container && container.children.length === 0) { // Only add script if container is empty
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = `
                atOptions = ${JSON.stringify(atOptions)};
                document.write('<scr' + 'ipt type="text/javascript" src="//www.effectivecreativeformat.com/5f4d99dc5499dc62c5353fdfdfe2e35f/invoke.js"></scr' + 'ipt>');
            `;
            container.appendChild(script);
        }
    } catch (e) {
        console.error('Ad script error:', e);
    }
  }, [uniqueId, isAdmin]);


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
            {/* The unique ID is assigned here */}
            <div id={`container-${uniqueId}`}></div>
        </div>
    </Card>
  );
}

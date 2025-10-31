'use client';
import Script from 'next/script';

export function AdBanner() {
  return (
    <div className="flex justify-center items-center aspect-[3/4] w-full">
        <div className="flex justify-center items-center w-[300px] h-[250px]">
            <Script
                id="adsterra-banner-300-250"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                __html: `
                    atOptions = {
                        'key' : '1aa94d7450572033bf4e3ce4bf8efaa7',
                        'format' : 'iframe',
                        'height' : 250,
                        'width' : 300,
                        'params' : {}
                    };
                `,
                }}
            />
            <Script
                async
                src="//www.highperformanceformat.com/1aa94d7450572033bf4e3ce4bf8efaa7/invoke.js"
                strategy="afterInteractive"
            />
        </div>
    </div>
  );
}

'use client';
import Script from 'next/script';

export function AdBanner() {
  return (
    <div className="flex justify-center items-center aspect-[3/4] w-full">
        <div className="flex flex-col justify-center items-center w-full">
             <Script 
                async={true}
                data-cfasync="false" 
                src="//pl27958407.effectivegatecpm.com/5f4d99dc5499dc62c5353fdfdfe2e35f/invoke.js"
                strategy="afterInteractive"
             />
            <div id="container-5f4d99dc5499dc62c5353fdfdfe2e35f"></div>
        </div>
    </div>
  );
}

'use client';
import Script from 'next/script';

export function AdBanner() {
  return (
    <div className="flex justify-center items-center aspect-[3/4] w-full">
      <div id="container-5f4d99dc5499dc62c5353fdfdfe2e35f"></div>
      <Script
        id="adsterra-native-banner"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof atAsyncOptions !== 'object') var atAsyncOptions = [];
            atAsyncOptions.push({
                'key': '5f4d99dc5499dc62c5353fdfdfe2e35f',
                'format': 'js',
                'async': true,
                'container': 'container-5f4d99dc5499dc62c5353fdfdfe2e35f',
                'params': {}
            });
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = '//pl27958407.effectivegatecpm.com/5f4d99dc5499dc62c5353fdfdfe2e35f/invoke.js';
            document.head.appendChild(script);
        `,
        }}
      />
    </div>
  );
}

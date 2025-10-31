import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'EVYKA',
  description: 'Discover and purchase unique, high-quality images from talented photographers around the world.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="google-adsense-account" content="ca-pub-6434494026178547" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6434494026178547"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
        <script type='text/javascript' src='//pl27958404.effectivegatecpm.com/47/2e/54/472e5469e9a7e3864565f60e6138e84e.js'></script>
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          {children}
          <Toaster />
        </FirebaseClientProvider>
        <script type='text/javascript' src='//pl27958400.effectivegatecpm.com/12/55/62/1255623bad89bb132fff6306d12044ad.js'></script>
      </body>
    </html>
  );
}

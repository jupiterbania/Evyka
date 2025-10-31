import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import Script from 'next/script';
import { AdScriptHead } from '@/components/ad-script-head';
import { AdScriptBody } from '@/components/ad-script-body';

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
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AdScriptHead />
          <FirebaseErrorListener />
          {children}
          <Toaster />
          <AdScriptBody />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

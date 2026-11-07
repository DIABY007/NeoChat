import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import PostHogProvider from '@/components/PostHogProvider';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://neochat.pro'),
  title: {
    default: 'NeoChat - Bot WhatsApp & Automatisation IA',
    template: '%s | NeoChat - Bot WhatsApp & Automatisation IA',
  },
  description: 'Automatisez vos ventes sur WhatsApp 24/7 avec l\'IA. Créez votre bot sans coder, envoyez des diffusions ciblées et propulsez votre e-commerce en Afrique.',
  keywords: ['bot WhatsApp', 'automatisation WhatsApp', 'IA WhatsApp', 'chatbot IA', 'diffusion WhatsApp', 'marketing WhatsApp', 'e-commerce Afrique', 'bot sans code', 'WhatsApp Business', 'automatisation ventes'],
  authors: [{ name: 'NeoChat' }],
  creator: 'NeoChat',
  publisher: 'NeoChat',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://neochat.pro',
    siteName: 'NeoChat',
    title: 'NeoChat - Bot WhatsApp & Automatisation IA',
    description: 'Automatisez vos ventes sur WhatsApp 24/7 avec l\'IA. Créez votre bot sans coder, envoyez des diffusions ciblées et propulsez votre e-commerce en Afrique.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NeoChat - Automatisation WhatsApp avec IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeoChat - Bot WhatsApp & Automatisation IA',
    description: 'Automatisez vos ventes sur WhatsApp 24/7 avec l\'IA. Créez votre bot sans coder, envoyez des diffusions ciblées et propulsez votre e-commerce en Afrique.',
    images: ['/og-image.png'],
    creator: '@neochat',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'hwGc6zrXp9rN-n-aJ5oJO3AzIRskCpWQKwM3Z0jvYo4',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NeoChat',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#f97316" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NeoChat" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <GoogleAnalytics />
      <body className={`${inter.variable} font-sans antialiased`}>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <PWAInstallPrompt />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

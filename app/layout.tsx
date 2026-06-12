import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { Inter, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';

const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

const interHeading = Inter({ subsets: ['latin'], variable: '--font-heading' });

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Monarch — Private, End-to-End Encrypted Messenger',
    template: '%s · Monarch',
  },
  description:
    'Monarch is a beautifully crafted, end-to-end encrypted messenger. Tapback reactions, disappearing messages, encrypted photos and view-once media — your messages, your keys, on every device.',
  applicationName: 'Monarch',
  keywords: [
    'encrypted messenger',
    'end-to-end encryption',
    'private chat app',
    'secure messaging',
    'disappearing messages',
    'E2EE chat',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Monarch',
    title: 'Monarch — Private, End-to-End Encrypted Messenger',
    description:
      'Beautifully crafted, end-to-end encrypted messaging. Your messages, your keys, on every device.',
    images: [{ url: '/logo/android-chrome-512x512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'Monarch — Private, End-to-End Encrypted Messenger',
    description:
      'Beautifully crafted, end-to-end encrypted messaging. Your messages, your keys, on every device.',
    images: ['/logo/android-chrome-512x512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Monarch',
  },
  icons: {
    icon: [
      { url: '/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/logo/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'h-full antialiased',
        'font-sans',
        inter.variable,
        interHeading.variable,
        geistMono.variable,
      )}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

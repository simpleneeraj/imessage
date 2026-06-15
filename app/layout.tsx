import './styles/globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from 'next-themes';
import type { Metadata, Viewport } from 'next';
import { THEMES, DEFAULT_THEME } from '@/lib/themes';
import fonts from './fonts';

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Love Quotes',
  description: 'A small collection of words about love.',
  applicationName: 'Love Quotes',
  keywords: [
    'love quotes',
    'romantic quotes',
    'quotes about love',
    'famous love quotes',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Love Quotes',
    title: 'Love Quotes',
    description: 'A small collection of words about love.',
    images: [{ url: '/logo/icon-512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'Love Quotes',
    description: 'A small collection of words about love.',
    images: ['/logo/icon-512.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Love Quotes',
  },
  // Icons come from the file conventions: app/favicon.ico, app/icon.tsx,
  // app/apple-icon.tsx (no manual override here).
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
  // Let the on-screen keyboard shrink the layout viewport so fixed chrome
  // (the chat header) stays put instead of scrolling out of view.
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn('h-full antialiased', fonts)}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          themes={THEMES}
          defaultTheme={DEFAULT_THEME}
          enableSystem={false}
          enableColorScheme={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

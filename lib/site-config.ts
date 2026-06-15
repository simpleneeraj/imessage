export const siteConfig = {
  name: 'festhub',
  title: 'festhub',
  description: 'Discover and share your favourite quotes, all in one place.',
  applicationName: 'festhub',
  keywords: [
    'quotes',
    'festhub',
    'love quotes',
    'inspirational quotes',
    'famous quotes',
  ],
  ogImage: '/logo/icon-512.png',

  /** Parts passed to the <Logo> component */
  logoParts: [
    { text: 'fest', className: 'font-light' },
    { text: 'hub', className: 'font-bold' },
  ],
} as const;

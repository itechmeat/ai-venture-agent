import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Theme } from '@radix-ui/themes';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';
import '@radix-ui/themes/styles.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Venture Agent',
  description: 'Autonomous investment decision system for venture funds',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Venture Agent" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <QueryProvider>
          <Theme accentColor="blue" grayColor="gray" radius="medium">
            {children}
          </Theme>
        </QueryProvider>
      </body>
    </html>
  );
}

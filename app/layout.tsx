import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Office Quiz | Live Trivia Challenge',
  description: 'Live real-time trivia quiz for the office event.',
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#0b1220' },
} as Metadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-center"
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(222 40% 11%)',
              border: '1px solid hsl(222 30% 20%)',
              color: 'hsl(210 40% 98%)',
            },
          }}
        />
      </body>
    </html>
  );
}

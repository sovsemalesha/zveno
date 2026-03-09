import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zveno - Voice Chat',
  description: 'Discord-like voice chat application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

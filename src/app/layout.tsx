import type { Metadata } from 'next';
import './globals.css';
import { DemoProvider } from '@/context/DemoContext';
import { Header } from '@/components/layout/Header';
import { ToastNotification } from '@/components/shared/ToastNotification';
import { GlobalModals } from '@/components/shared/GlobalModals';

export const metadata: Metadata = {
  title: 'CARS24 Marketing Assistant',
  description: 'Business and marketing analyst chat for CARS24 — buying, selling, financing and owning used cars.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased font-sans">
        <DemoProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)] overflow-x-hidden">
            {children}
          </main>
          <ToastNotification />
          <GlobalModals />
        </DemoProvider>
      </body>
    </html>
  );
}

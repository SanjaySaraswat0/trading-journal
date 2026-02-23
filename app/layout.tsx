import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "AI-Powered Trading Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
          <Toaster position="top-right" richColors />
        </ErrorBoundary>
      </body>
    </html>
  );
}
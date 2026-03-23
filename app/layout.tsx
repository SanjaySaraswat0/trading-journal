import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { ErrorBoundary } from '@/components/error-boundary';
import ThreeDBackground from '@/components/ui/three-d-background';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Trading Journal — AI-Powered",
  description: "AI-powered trading analysis, psychology tracking, and advanced pattern insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* 3D Canvas background — fixed, behind everything, all pages */}
        <ThreeDBackground />

        {/* Page content sits above canvas via z-index */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ErrorBoundary>
            <Providers>
              {children}
            </Providers>
            <Toaster
              position="top-right"
              richColors
              toastOptions={{
                style: {
                  background: 'rgba(26,33,51,0.95)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#f1f5f9',
                  backdropFilter: 'blur(16px)',
                },
              }}
            />
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Absensi Standalone",
  description: "Sistem manajemen absensi dengan GPS tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProvider>
          <div className="min-h-screen glassmorphism-bg">
            {/* Floating Background Elements */}
            <div className="floating-orb"></div>
            <div className="floating-orb"></div>
            <div className="floating-orb"></div>

            <Sidebar />
            <main className="lg:pl-64 relative z-10">
              <div className="p-4 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

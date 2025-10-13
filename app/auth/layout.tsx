import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Authentication - Absensi Standalone",
  description: "Login ke sistem absensi dengan GPS tracking",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen glassmorphism-bg">
      {/* Simple Floating Glass Circles for auth pages */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>

      {children}
    </div>
  );
}

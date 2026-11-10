import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Security Alert | Accessible Emergency Dispatch",
  description:
    "Accessible, screen-reader optimized emergency security alert system with multi-channel dispatch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-black font-sans">
        {children}
      </body>
    </html>
  );
}

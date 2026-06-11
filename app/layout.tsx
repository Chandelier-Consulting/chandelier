import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Bodoni_Moda({
  variable: "--font-display-face",
  subsets: ["latin"],
});

const sansFont = Hanken_Grotesk({
  variable: "--font-text-face",
  subsets: ["latin"],
});

const monoFont = Space_Mono({
  variable: "--font-mono-face",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chandelier Consulting - We illuminate what's possible",
  description:
    "Chandelier Consulting helps brick-and-mortar businesses modernize with custom websites, agentic AI, and ordering and operations systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

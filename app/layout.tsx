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
  metadataBase: new URL("https://chandelierconsulting.dev"),
  title: {
    default: "Chandelier Consulting | Websites, AI, and Operations Systems",
    template: "%s | Chandelier Consulting",
  },
  description:
    "Chandelier Consulting builds custom websites, agentic AI, and ordering and operations systems for growing brick-and-mortar businesses.",
  applicationName: "Chandelier Consulting",
  authors: [{ name: "Chandelier Consulting" }],
  creator: "Chandelier Consulting",
  publisher: "Perceo Inc.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Chandelier Consulting | Websites, AI, and Operations Systems",
    description:
      "Custom websites, agentic AI, and operations systems for growing brick-and-mortar businesses.",
    url: "/",
    siteName: "Chandelier Consulting",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Chandelier Consulting | Websites, AI, and Operations Systems",
    description:
      "Custom websites, agentic AI, and operations systems for growing brick-and-mortar businesses.",
  },
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

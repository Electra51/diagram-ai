import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://diagram-ai.vercel.app"),
  title: {
    default: "Diagram AI | Generate Flowcharts from Plain English",
    template: "%s | Diagram AI",
  },
  description:
    "Turn natural-language prompts into polished workflow diagrams for login flows, e-commerce journeys, and system architecture ideas.",
  keywords: [
    "diagram ai",
    "workflow generator",
    "ai diagram generator",
    "react flow",
    "prompt to diagram",
  ],
  authors: [{ name: "Safayet" }],
  openGraph: {
    title: "Diagram AI | Generate Flowcharts from Plain English",
    description:
      "Create interactive workflow diagrams from prompts with AI in seconds.",
    url: "https://diagram-ai.vercel.app",
    siteName: "Diagram AI",
    type: "website",
    images: [
      {
        url: "/home.png",
        width: 1200,
        height: 630,
        alt: "Diagram AI interface preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diagram AI | Generate Flowcharts from Plain English",
    description:
      "Create interactive workflow diagrams from prompts with AI in seconds.",
    images: ["/home.png"],
  },
  alternates: {
    canonical: "https://diagram-ai.vercel.app",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

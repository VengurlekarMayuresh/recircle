import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import NextAuthProvider from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import ChatPanel from "@/components/chat-panel";
import PageTransition from "@/components/page-transition";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReCircle — Circular Economy Marketplace",
  description: "Every material deserves a second life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <NextAuthProvider>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
          <Toaster />
          <ChatPanel />
        </NextAuthProvider>
      </body>
    </html>
  );
}

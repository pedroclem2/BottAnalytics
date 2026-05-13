import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Sidebar } from "@/components/layout/sidebar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { cn } from "@/lib/ui/cn";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetMono = JetBrains_Mono({
  variable: "--font-jet-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DGE CSAT — Executive Dashboard",
  description:
    "Customer satisfaction analytics for Abu Dhabi government entities across 2025–2026.",
  icons: {
    icon: "/dge-logo.png",
    apple: "/dge-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, jetMono.variable, "h-full antialiased")}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <NuqsAdapter>
            <div className="flex min-h-screen items-stretch">
              <Sidebar />
              <main className="relative flex min-w-0 flex-1 flex-col">{children}</main>
            </div>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}

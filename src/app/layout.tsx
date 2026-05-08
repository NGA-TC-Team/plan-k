import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/services/providers";
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
  title: "plan-k",
  description: "Local planning workspace for web, mobile, and AI agent specs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Pre-hydration theme bootstrap — avoids FOUC by reading the persisted
            theme from localStorage before React paints. Default = dark. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted inline script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("plan-k:theme");var t="dark";if(s){var p=JSON.parse(s);if(p&&p.state&&p.state.theme){t=p.state.theme;}}var r=document.documentElement;if(t==="dark"){r.classList.add("dark");}r.style.colorScheme=t;}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

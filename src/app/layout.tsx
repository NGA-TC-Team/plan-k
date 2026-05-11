import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/services/providers";
import "katex/dist/katex.min.css";
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
            __html: `(function(){try{var s=localStorage.getItem("plan-k:theme");var isDark=true;if(s){var p=JSON.parse(s);var st=p&&p.state;if(st){var mode=st.mode||(st.theme)||"dark";if(mode==="light"){isDark=false;}else if(mode==="system"){isDark=window.matchMedia("(prefers-color-scheme: dark)").matches;}else if(mode==="auto"){var h=new Date().getHours();var ds=typeof st.autoDarkStart==="number"?st.autoDarkStart:18;var de=typeof st.autoDarkEnd==="number"?st.autoDarkEnd:7;isDark=ds<de?(h>=ds&&h<de):(h>=ds||h<de);}}}var r=document.documentElement;r.classList.toggle("dark",isDark);r.style.colorScheme=isDark?"dark":"light";}catch(e){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

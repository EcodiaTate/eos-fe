import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "EcodiaOS — Aurora",
  description: "A living digital organism",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise-bg">
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <main
            className="flex-1 overflow-y-auto"
            style={{ background: "var(--bg)" }}
          >
            <div className="p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

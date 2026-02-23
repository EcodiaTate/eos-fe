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
      <body>
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

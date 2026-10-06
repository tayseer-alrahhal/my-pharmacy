import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { ClientOnly } from "@/components/shared/ClientOnly";

export const metadata: Metadata = {
  title: "نظام إدارة الصيدلية",
  description: "نظام متكامل لإدارة الصيدلية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface overflow-hidden h-screen flex flex-col">
        <Providers>
          <ClientOnly>
            <TopBar />
            <div className="flex flex-1 overflow-hidden" style={{ marginTop: '64px' }}>
              <Sidebar />
              <main
                className="flex-1 overflow-y-auto bg-background custom-scrollbar"
                style={{ marginRight: '260px' }}
              >
                {children}
              </main>
            </div>
          </ClientOnly>
        </Providers>
      </body>
    </html>
  );
}

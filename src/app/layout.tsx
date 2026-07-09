import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Cursed Depths — Dungeon Crawler RPG",
  description: "D&D 5e dungeon crawler RPG в Telegram. Исследуй проклятые глубины!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Telegram WebApp SDK, самохостится на своём домене (public/telegram-web-app.js) —
            telegram.org у части российских провайдеров недоступен/подвисает и блокирует
            рендер всей страницы, т.к. скрипт синхронный и должен догрузиться до <body>.
            Должен грузиться ДО кода приложения. */}
        <Script
          src="/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

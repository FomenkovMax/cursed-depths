import type { Metadata, Viewport } from "next";
import { PT_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Декоративный шрифт заголовков экранов (по референсу "Зов Теней" — двухъярусная типографика:
// serif-заголовок vs sans-тело). Подключается один раз здесь и применяется точечно через класс
// .font-display (globals.css) на CardTitle/DialogTitle (src/components/ui/*), а не по всему
// проекту — так каскадом получают эффект все существующие заголовки экранов без правки page.tsx.
const displayFont = PT_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

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
      <body className={`${displayFont.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

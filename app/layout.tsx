import type { Metadata } from "next";
import {
  IBM_Plex_Sans_Arabic,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-latin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "L3BTY | لعبتي",
    template: "%s | L3BTY",
  },
  description: "الأساس التقني لتطبيق L3BTY لإدارة نشاط لعبتي.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexSansArabic.variable} ${plusJakartaSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

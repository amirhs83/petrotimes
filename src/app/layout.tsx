import type { Metadata, Viewport } from "next";
import { iransans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Petro Times - پترو تایمز",
  description:
    "A comprehensive view of price fluctuations in the oil, gas, and petrochemical markets, with a focus on data analysis, is available on the petrotimes.ir",
  keywords: ["Petro Times", "نفت", "گاز", "پتروشیمی", "انرژی", "oil", "gas"],
  authors: [{ name: "Petro Times" }],
  openGraph: {
    title: "Petro Times",
    description: "Oil, gas and petrochemical market news and analysis",
    siteName: "Petro Times",
    type: "website",
    locale: "fa_IR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* Typography spec: html lang="fa" dir="rtl"; the IRANSans next/font/local
       classes (variable --font-iransans + generated family) sit on <html> so
       the whole cascade inherits the real self-hosted weights. next/font
       emits its own preload links for the four woff2 files (preload:true).
       The Barlow/ts-icons preloads stay: the Latin UI font (--ui-font) and
       the icon font are still part of the chrome. crossOrigin is required
       for fonts. */
    <html lang="fa" dir="rtl" className={`${iransans.variable} ${iransans.className}`}>
      <body>
        <link rel="preload" href="/assets/fonts/Barlow-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/Barlow-600-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/ts-icons.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {children}
      </body>
    </html>
  );
}

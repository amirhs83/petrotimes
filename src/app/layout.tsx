import type { Metadata, Viewport } from "next";
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
    <html lang="fa-IR" dir="rtl">
      <body>
        {/* Preload above-the-fold fonts so the real woff2 wins the
            font-display:swap race even on slow mobile networks — prevents
            fallback-font flashes (client screenshot: Subscribe ink sat low
            because Barlow had not rendered yet). React 19 hoists these
            <link> tags into <head>. crossOrigin is required for fonts. */}
        <link rel="preload" href="/assets/fonts/Barlow-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/Barlow-600-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/Vazir.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/Vazir-Bold.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/fonts/ts-icons.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {children}
      </body>
    </html>
  );
}

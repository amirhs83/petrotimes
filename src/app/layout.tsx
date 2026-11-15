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
      <body>{children}</body>
    </html>
  );
}

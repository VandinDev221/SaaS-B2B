import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata: Metadata = {
  title: "FLOWOS — Sistema Operacional Comercial",
  description: "WhatsApp, CRM, orçamento, cobrança e automação para pequenos negócios"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontDisplay.variable} font-sans`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

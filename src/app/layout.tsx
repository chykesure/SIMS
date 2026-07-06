import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chyksys Everything Your School Needs. One Simple Platform.",
  description:
    "Chyksys helps Nigerian schools manage student records, automate result computation, track school fees, monitor attendance, prepare lesson notes with AI, and streamline daily operations — all from one secure, easy-to-use platform.",
  keywords: [
    "Chyksys",
    "school management software",
    "Nigeria",
    "school administration",
    "result computation",
    "school fees",
    "attendance tracking",
    "AI lesson notes",
    "report cards",
    "school management system",
  ],
  authors: [{ name: "ChykeTech" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Chyksys Everything Your School Needs. One Simple Platform.",
    description:
      "Manage student records, automate results, track fees, monitor attendance, and prepare AI lesson notes — all from one platform.",
    url: "https://chyksys.com",
    siteName: "Chyksys",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chyksys School Management Made Simple",
    description:
      "One platform for student records, results, fees, attendance, and AI lesson notes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
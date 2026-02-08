import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Buy",
  description: "AI-powered shopping assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

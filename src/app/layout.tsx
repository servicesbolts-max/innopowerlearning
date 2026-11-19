import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: `${PRODUCT_NAME}: learning spaces for Innopower AI and its partners.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

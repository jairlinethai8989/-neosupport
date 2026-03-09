import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEO Support — IT Ticketing System",
  description: "IT Support Ticketing System for 100+ Hospitals",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

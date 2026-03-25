import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "NEO Support — IT Ticketing System",
  description: "IT Support Ticketing System for 100+ Hospitals",
  verification: {
    google: "google2a0d6266a1b7ca5c",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <ErrorBoundary>
          <NextTopLoader color="var(--primary)" height={3} showSpinner={false} />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

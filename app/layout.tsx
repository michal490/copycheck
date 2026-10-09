import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CopyCheck — See where you stand",
  description: "Check your crypto holdings, unrealized gains and break-even prices. Review Solana trades and compare wallets when you want to go deeper.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "PoB Codes",
  description: "Read-only Path of Building viewer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

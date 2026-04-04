import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "PoB Codes",
  description: "Read-only Path of Building viewer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="site-brand">
                PoB Codes
              </Link>
            </div>
          </header>
          <div className="site-shell-content">{children}</div>
          <footer className="site-footer">
            <span>
              PoB Codes is an unofficial fan-made Path of Exile tool. Path of Exile and related assets are (c)
              Grinding Gear Games. Not affiliated with or endorsed by Grinding Gear Games.
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}

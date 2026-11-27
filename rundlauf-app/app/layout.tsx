import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DRK Rundlaufbeschlüsse",
    template: "%s – DRK Rundlaufbeschlüsse",
  },
  description:
    "Digitales Umlaufverfahren für Präsidien des Deutschen Roten Kreuzes",
  icons: { icon: "/favicon.svg" },
};

function HelpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function RedCrossIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2z" fill="#e30613" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        <header
          className="flex items-center justify-between gap-3 px-6 py-4"
          style={{ background: "#e30613", color: "#fff" }}
        >
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="DRK Logo" width={42} height={42} />
            <div>
              {/* Site title is not a heading: each page brings its own h1. */}
              <span className="block text-[1.4rem] font-bold leading-tight">
                DRK Rundlaufbeschlüsse
              </span>
              <span className="block text-[0.8rem]">
                Umlaufverfahren für Präsidien
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/hilfe"
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors"
              title="Hilfe"
              aria-label="Hilfe"
            >
              <HelpIcon />
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer
          className="text-center py-10 mt-8 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="text-sm font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--drk)" }}
          >
            Deutsches Rotes Kreuz
          </div>
          <div className="text-sm mb-3" style={{ color: "var(--text-light)" }}>
            Kreisverband St&auml;dteRegion Aachen e.V.
          </div>
          <nav aria-label="Rechtliches und Hilfe" className="text-sm mb-3" style={{ color: "var(--text-light)" }}>
            <Link href="/impressum" className="inline-block px-2 py-2 hover:underline" style={{ color: "inherit" }}>
              Impressum
            </Link>
            {" · "}
            <Link href="/datenschutz" className="inline-block px-2 py-2 hover:underline" style={{ color: "inherit" }}>
              Datenschutz
            </Link>
            {" · "}
            <Link href="/hilfe" className="inline-block px-2 py-2 hover:underline" style={{ color: "inherit" }}>
              Hilfe
            </Link>
          </nav>
          <div
            className="text-xs flex items-center justify-center gap-1"
            style={{ color: "var(--text-light)" }}
          >
            made with{" "}
            <span style={{ color: "var(--drk)" }}>&#10084;</span>
            {" "}for{" "}
            <RedCrossIcon />
          </div>
        </footer>
      </body>
    </html>
  );
}

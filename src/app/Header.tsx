"use client";

import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { SITE_LANGUAGES } from "@/lib/i18n";

export default function Header() {
  const { lang, setLang, t } = useLang();
  const current = SITE_LANGUAGES.find((l) => l.code === lang);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-primary"
        >
          <span className="text-2xl">🎸</span>
          Let&apos;s Sing Together
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            {t("nav.songList")}
          </Link>
          <Link
            href="/upload"
            className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            {t("nav.upload")}
          </Link>

          {/* Language Dropdown */}
          <div className="relative">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
              className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-2 text-sm cursor-pointer hover:border-primary transition-colors"
            >
              {SITE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted text-xs">
              ▼
            </span>
          </div>
        </div>
      </nav>
    </header>
  );
}

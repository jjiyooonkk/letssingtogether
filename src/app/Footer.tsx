"use client";

import { useLang } from "@/lib/LangContext";

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border py-6 text-center text-sm text-muted">
      Let&apos;s Sing Together &copy; {new Date().getFullYear()} &mdash;{" "}
      {t("footer.tagline")}
    </footer>
  );
}

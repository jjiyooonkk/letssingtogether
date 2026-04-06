"use client";

import Link from "next/link";
import type { Song } from "@/lib/constants";
import { useLang } from "@/lib/LangContext";
import SongList from "./SongList";

export default function HomeClient({ songs }: { songs: Song[] }) {
  const { t } = useLang();

  return (
    <div>
      <section className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">Let&apos;s Sing Together</h1>
        <p className="text-muted text-lg">{t("home.subtitle")}</p>
      </section>

      {songs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg mb-4">{t("home.noSongs")}</p>
          <Link
            href="/upload"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            {t("home.uploadFirst")}
          </Link>
        </div>
      ) : (
        <SongList songs={songs} />
      )}
    </div>
  );
}

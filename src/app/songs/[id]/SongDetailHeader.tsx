"use client";

import Link from "next/link";
import type { Song } from "@/lib/constants";
import { useLang } from "@/lib/LangContext";

export default function SongDetailHeader({ song, songNumber }: { song: Song; songNumber: number }) {
  const { lang, t } = useLang();

  const title = lang === "ko" ? song.title : (song.translations[lang]?.title || song.title);
  const artist = lang === "ko" ? song.artist : (song.translations[lang]?.artist || song.artist);

  function tagLabel(tag: string) {
    const key = `tag.${tag}`;
    const val = t(key);
    return val !== key ? val : tag;
  }

  return (
    <>
      <Link
        href="/"
        className="text-muted hover:text-foreground text-sm mb-6 inline-block"
      >
        &larr; {t("song.backToList")}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-primary bg-primary-light w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            {songNumber}
          </span>
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        <div className="flex items-center gap-3 mt-2 ml-13">
          <p className="text-muted">{artist}</p>
          <span className="text-xs bg-primary-light text-primary px-2 py-1 rounded-full font-medium">
            {t(`cat.${song.category}`)}
          </span>
        </div>
        {song.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-13">
            {song.tags.map((tag) => (
              <span key={tag} className="text-sm text-primary font-medium">
                #{tagLabel(tag)}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

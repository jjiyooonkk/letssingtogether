"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { Song } from "@/lib/constants";
import { CATEGORIES } from "@/lib/constants";
import { useLang } from "@/lib/LangContext";

export default function SongList({ songs }: { songs: Song[] }) {
  const { lang, t } = useLang();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showGayo, setShowGayo] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("showGayo");
    if (stored === "true") setShowGayo(true);

    function onStorage(e: StorageEvent) {
      if (e.key === "showGayo") setShowGayo(e.newValue === "true");
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function songTitle(song: Song) {
    if (lang === "ko") return song.title;
    return song.translations[lang]?.title || song.title;
  }
  function songArtist(song: Song) {
    if (lang === "ko") return song.artist;
    return song.translations[lang]?.artist || song.artist;
  }
  function tagLabel(tag: string) {
    const key = `tag.${tag}`;
    const val = t(key);
    return val !== key ? val : tag;
  }

  const songNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title, "ko"));
    sorted.forEach((s, idx) => map.set(s.id, idx + 1));
    return map;
  }, [songs]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    songs.forEach((s) => s.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [songs]);

  const visibleCategories = useMemo(() => {
    if (showGayo) return CATEGORIES;
    return CATEGORIES.filter((c) => c !== "가요");
  }, [showGayo]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return songs
      .filter((s) => {
        if (!showGayo && s.category === "가요" && activeCategory !== "가요") return false;
        if (activeCategory && s.category !== activeCategory) return false;
        if (activeTag && !s.tags?.includes(activeTag)) return false;
        if (q) {
          const title = songTitle(s).toLowerCase();
          const artist = songArtist(s).toLowerCase();
          const lyrics = s.lyrics.map((l) => l.line).join(" ").toLowerCase();
          const tags = (s.tags || []).join(" ").toLowerCase();
          if (!title.includes(q) && !artist.includes(q) && !lyrics.includes(q) && !tags.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        const catA = CATEGORIES.indexOf(a.category);
        const catB = CATEGORIES.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        return a.title.localeCompare(b.title, "ko");
      });
  }, [songs, activeCategory, activeTag, searchQuery, showGayo, lang]);

  const pillActive = "bg-primary text-white";
  const pillInactive = "bg-card border border-border text-muted hover:text-foreground";

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      <div className="space-y-4 mb-8">
        {/* Category */}
        <div>
          <p className="text-xs font-medium text-muted mb-2">{t("filter.category")}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveCategory(null)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === null ? pillActive : pillInactive}`}>
              {t("filter.all")}
            </button>
            {visibleCategories.map((cat) => {
              const count = songs.filter((s) => s.category === cat).length;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? pillActive : pillInactive}`}>
                  {t(`cat.${cat}`)}<span className="ml-1 opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted mb-2">{t("filter.tags")}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTag(null)} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${activeTag === null ? pillActive : pillInactive}`}>
                {t("filter.all")}
              </button>
              {allTags.map((tag) => (
                <button key={tag} onClick={() => setActiveTag(tag)} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${activeTag === tag ? pillActive : pillInactive}`}>
                  #{tagLabel(tag)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted">{t("filter.noResults")}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {filtered.map((song) => {
            const num = songNumberMap.get(song.id) ?? 0;
            return (
              <Link
                key={song.id}
                href={`/songs/${song.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-primary-light/30 transition-colors"
              >
                <span className="text-sm font-bold text-primary bg-primary-light w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                  {num}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold truncate">{songTitle(song)}</h2>
                    <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                      {t(`cat.${song.category}`)}
                    </span>
                  </div>
                  <p className="text-muted text-sm truncate">{songArtist(song)}</p>
                </div>
                {song.tags?.length > 0 && (
                  <div className="hidden sm:flex flex-wrap gap-1.5 shrink-0">
                    {song.tags.map((tag) => (
                      <span key={tag} className="text-xs text-primary font-medium">#{tagLabel(tag)}</span>
                    ))}
                  </div>
                )}
                <span className="text-muted text-sm shrink-0">&rsaquo;</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { Song } from "@/lib/constants";
import { useLang } from "@/lib/LangContext";

function getYoutubeEmbedId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function SongViewer({ song }: { song: Song }) {
  const { lang, t } = useLang();
  const [showRomanization, setShowRomanization] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showChords, setShowChords] = useState(true);
  const [showSheet, setShowSheet] = useState(false);

  const translation = lang !== "ko" ? song.translations[lang] : null;

  const youtubeEmbedId = useMemo(
    () => (song.youtubeUrl ? getYoutubeEmbedId(song.youtubeUrl) : null),
    [song.youtubeUrl]
  );

  return (
    <div>
      {/* Media Player */}
      {(youtubeEmbedId || song.audioUrl) && (
        <div className="mb-6 space-y-4">
          {youtubeEmbedId && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtubeEmbedId}`}
                  title={song.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
          {song.audioUrl && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-2">{t("song.listenAudio")}</p>
              <audio controls className="w-full" preload="metadata">
                <source src={song.audioUrl} />
              </audio>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showChords} onChange={(e) => setShowChords(e.target.checked)} className="accent-primary" />
            {t("song.chords")}
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={showRomanization} onChange={(e) => setShowRomanization(e.target.checked)} className="accent-primary" />
            {t("song.romanization")}
          </label>
          {lang !== "ko" && (
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={showTranslation} onChange={(e) => setShowTranslation(e.target.checked)} className="accent-primary" />
              {t("song.translation")}
            </label>
          )}
          {song.sheetMusicUrls && song.sheetMusicUrls.length > 0 && (
            <button
              onClick={() => setShowSheet(!showSheet)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${showSheet ? "bg-primary text-white" : "bg-primary-light text-primary hover:bg-primary hover:text-white"}`}
            >
              {showSheet ? t("song.hideSheet") : t("song.viewSheet")}
            </button>
          )}
        </div>
      </div>

      {/* Piano Sheet Music */}
      {showSheet && song.sheetMusicUrls && song.sheetMusicUrls.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">{t("song.pianoSheet")}</h3>
          <div className="space-y-4">
            {song.sheetMusicUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`${song.title} - ${t("song.pianoSheet")} ${idx + 1}`}
                className="w-full rounded-lg border border-border"
              />
            ))}
          </div>
        </div>
      )}

      {/* Lyrics */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {song.lyrics.map((lyricLine, idx) => (
          <div key={idx} className="space-y-1">
            {showChords && lyricLine.chords.some((c) => c) && (
              <div className="flex gap-6">
                {lyricLine.chords.map((chord, ci) =>
                  chord ? <span key={ci} className="chord-badge">{chord}</span> : null
                )}
              </div>
            )}
            <p className="text-lg font-medium">{lyricLine.line}</p>
            {showRomanization && song.romanization[idx] && (
              <p className="text-sm text-primary italic">{song.romanization[idx]}</p>
            )}
            {showTranslation && translation?.lines[idx] && (
              <p className="text-sm text-muted">{translation.lines[idx]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

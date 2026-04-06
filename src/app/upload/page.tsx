"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { useLang } from "@/lib/LangContext";
import { SITE_LANGUAGES } from "@/lib/i18n";

interface LyricLine {
  line: string;
  chords: string;
}

interface TranslationInput {
  lang: string;
  title: string;
  lines: string;
}

export default function UploadPage() {
  const router = useRouter();
  const { t } = useLang();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [sheetMusicInput, setSheetMusicInput] = useState("");
  const [lyrics, setLyrics] = useState<LyricLine[]>([{ line: "", chords: "" }]);
  const [romanization, setRomanization] = useState("");
  const [translations, setTranslations] = useState<TranslationInput[]>([
    { lang: "en", title: "", lines: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function addLyricLine() {
    setLyrics([...lyrics, { line: "", chords: "" }]);
  }
  function removeLyricLine(idx: number) {
    setLyrics(lyrics.filter((_, i) => i !== idx));
  }
  function updateLyric(idx: number, field: keyof LyricLine, value: string) {
    const updated = [...lyrics];
    updated[idx][field] = value;
    setLyrics(updated);
  }
  function addTranslation() {
    setTranslations([...translations, { lang: "", title: "", lines: "" }]);
  }
  function removeTranslation(idx: number) {
    setTranslations(translations.filter((_, i) => i !== idx));
  }
  function updateTranslation(idx: number, field: keyof TranslationInput, value: string) {
    const updated = [...translations];
    updated[idx][field] = value;
    setTranslations(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !artist.trim()) {
      setError(t("upload.errorRequired"));
      return;
    }
    if (lyrics.every((l) => !l.line.trim())) {
      setError(t("upload.errorLyrics"));
      return;
    }
    setSubmitting(true);
    const body = {
      title: title.trim(),
      artist: artist.trim(),
      category,
      tags: tagsInput.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean),
      youtubeUrl: youtubeUrl.trim() || undefined,
      audioUrl: audioUrl.trim() || undefined,
      sheetMusicUrls: sheetMusicInput.split("\n").map((s) => s.trim()).filter(Boolean),
      lyrics: lyrics.filter((l) => l.line.trim()).map((l) => ({
        line: l.line.trim(),
        chords: l.chords.split(",").map((c) => c.trim()),
      })),
      romanization: romanization.split("\n").map((r) => r.trim()),
      translations: Object.fromEntries(
        translations.filter((tr) => tr.lang.trim() && tr.lines.trim()).map((tr) => [
          tr.lang.trim(),
          { title: tr.title.trim() || title.trim(), lines: tr.lines.split("\n").map((l) => l.trim()) },
        ])
      ),
    };
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      router.push(`/songs/${data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{t("upload.title")}</h1>
      <p className="text-muted mb-8">{t("upload.subtitle")}</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.basicInfo")}</h2>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.songTitle")}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 아리랑" className="w-full border border-border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.artist")}</label>
            <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="예: 전통 민요" className="w-full border border-border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.category")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="w-full border border-border rounded-lg px-3 py-2 bg-white">
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{t(`cat.${cat}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.tags")}</label>
            <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="예: 민요, 전통, 사랑" className="w-full border border-border rounded-lg px-3 py-2" />
            <p className="text-xs text-muted mt-1">{t("upload.tagsHint")}</p>
          </div>
        </section>

        {/* Media */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.media")}</h2>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.youtubeLink")}</label>
            <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.audioUrl")}</label>
            <input type="url" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://example.com/song.mp3" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            <p className="text-xs text-muted mt-1">{t("upload.audioHint")}</p>
          </div>
        </section>

        {/* Piano Sheet Music */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.pianoSheet")}</h2>
          <div>
            <label className="block text-sm font-medium mb-1">{t("upload.pianoSheetUrl")}</label>
            <textarea
              value={sheetMusicInput}
              onChange={(e) => setSheetMusicInput(e.target.value)}
              rows={3}
              placeholder="https://example.com/sheet1.png"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-muted mt-1">{t("upload.pianoSheetHint")}</p>
          </div>
        </section>

        {/* OCR - Handwritten Scan */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("ocr.title")}</h2>
          <p className="text-sm text-muted">{t("ocr.hint")}</p>

          {ocrPreview && (
            <img src={ocrPreview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-border" />
          )}

          <div className="flex items-center gap-3">
            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer transition-opacity ${scanning ? "bg-gray-300 text-gray-500" : "bg-primary text-white hover:opacity-90"}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={scanning}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setOcrMessage("");
                  setScanning(true);

                  // Show preview
                  const previewUrl = URL.createObjectURL(file);
                  setOcrPreview(previewUrl);

                  // Convert to base64
                  const buffer = await file.arrayBuffer();
                  const base64 = btoa(
                    new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), "")
                  );

                  try {
                    const res = await fetch("/api/ocr", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ image: base64, mimeType: file.type }),
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      throw new Error(data.error);
                    }
                    const data = await res.json();

                    // Fill in recognized data
                    if (data.title && !title) setTitle(data.title);
                    if (data.artist && !artist) setArtist(data.artist);
                    if (data.lyrics?.length) {
                      setLyrics(
                        data.lyrics.map((l: { line: string; chords: string }) => ({
                          line: l.line || "",
                          chords: l.chords || "",
                        }))
                      );
                    }
                    setOcrMessage(t("ocr.success"));
                  } catch {
                    setOcrMessage(t("ocr.error"));
                  } finally {
                    setScanning(false);
                    e.target.value = "";
                  }
                }}
              />
              {scanning ? t("ocr.scanning") : t("ocr.selectImage")}
            </label>
            {scanning && (
              <span className="text-sm text-muted animate-pulse">{t("ocr.scanning")}</span>
            )}
          </div>

          {ocrMessage && (
            <p className={`text-sm font-medium ${ocrMessage === t("ocr.success") ? "text-green-600" : "text-red-500"}`}>
              {ocrMessage}
            </p>
          )}
        </section>

        {/* Lyrics & Chords */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.lyricsChords")}</h2>
          <p className="text-sm text-muted">{t("upload.lyricsHint")}</p>
          {lyrics.map((line, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <input type="text" value={line.line} onChange={(e) => updateLyric(idx, "line", e.target.value)} placeholder={`${idx + 1}`} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
                <input type="text" value={line.chords} onChange={(e) => updateLyric(idx, "chords", e.target.value)} placeholder="Am, G, Em" className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono text-primary" />
              </div>
              {lyrics.length > 1 && (
                <button type="button" onClick={() => removeLyricLine(idx)} className="text-red-400 hover:text-red-600 text-sm mt-2">
                  {t("upload.delete")}
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addLyricLine} className="text-primary text-sm font-medium hover:underline">
            {t("upload.addLine")}
          </button>
        </section>

        {/* Romanization */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.romanization")}</h2>
          <p className="text-sm text-muted">{t("upload.romanizationHint")}</p>
          <textarea value={romanization} onChange={(e) => setRomanization(e.target.value)} rows={6} placeholder="arirang arirang arariyo" className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono" />
        </section>

        {/* Translations */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.translations")}</h2>
          <p className="text-sm text-muted">{t("upload.translationsHint")}</p>
          {translations.map((tr, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex gap-3">
                <div className="w-44">
                  <label className="block text-xs font-medium mb-1">{t("upload.langCode")}</label>
                  <select value={tr.lang} onChange={(e) => updateTranslation(idx, "lang", e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="">--</option>
                    {SITE_LANGUAGES.filter((l) => l.code !== "ko").map((l) => (
                      <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1">{t("upload.translatedTitle")}</label>
                  <input type="text" value={tr.title} onChange={(e) => updateTranslation(idx, "title", e.target.value)} placeholder="Arirang" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                {translations.length > 1 && (
                  <button type="button" onClick={() => removeTranslation(idx)} className="text-red-400 hover:text-red-600 text-sm self-end">
                    {t("upload.delete")}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t("upload.translatedLyrics")}</label>
                <textarea value={tr.lines} onChange={(e) => updateTranslation(idx, "lines", e.target.value)} rows={4} placeholder="Arirang, Arirang, Arariyo" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addTranslation} className="text-primary text-sm font-medium hover:underline">
            {t("upload.addTranslation")}
          </button>
        </section>

        <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50">
          {submitting ? t("upload.submitting") : t("upload.submit")}
        </button>
      </form>
    </div>
  );
}

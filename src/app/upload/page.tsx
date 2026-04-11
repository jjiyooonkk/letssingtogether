"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/constants";
import { useLang } from "@/lib/LangContext";

export default function UploadPage() {
  const router = useRouter();
  const { t } = useLang();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [sheetMusicInput, setSheetMusicInput] = useState("");
  const [sheetMusicFiles, setSheetMusicFiles] = useState<File[]>([]);
  const [sheetMusicPreviews, setSheetMusicPreviews] = useState<string[]>([]);
  const [uploadingSheets, setUploadingSheets] = useState(false);
  const [lyricsText, setLyricsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Preview translation state
  const [translating, setTranslating] = useState(false);
  const [previewRomanization, setPreviewRomanization] = useState<string[]>([]);
  const [previewEnTitle, setPreviewEnTitle] = useState("");
  const [previewEnArtist, setPreviewEnArtist] = useState("");
  const [previewEnLines, setPreviewEnLines] = useState<string[]>([]);
  const [previewReady, setPreviewReady] = useState(false);

  async function handlePreviewTranslate() {
    const lines = lyricsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!title.trim() || lines.length === 0) {
      setError("제목과 가사를 먼저 입력해주세요.");
      return;
    }
    setError("");
    setTranslating(true);
    try {
      const res = await fetch("/api/preview-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim(), lyrics: lines }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "번역 실패");
      }
      const data = await res.json();
      setPreviewRomanization(data.romanization || []);
      setPreviewEnTitle(data.en?.title || "");
      setPreviewEnArtist(data.en?.artist || "");
      setPreviewEnLines(data.en?.lines || []);
      setPreviewReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "번역 실패");
    } finally {
      setTranslating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !artist.trim()) {
      setError(t("upload.errorRequired"));
      return;
    }
    const lines = lyricsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError(t("upload.errorLyrics"));
      return;
    }
    setSubmitting(true);

    // Upload sheet music files first
    let uploadedUrls: string[] = [];
    if (sheetMusicFiles.length > 0) {
      setUploadingSheets(true);
      try {
        const formData = new FormData();
        sheetMusicFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error || "File upload failed");
        }
        const uploadData = await uploadRes.json();
        uploadedUrls = uploadData.urls;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "File upload error");
        setSubmitting(false);
        setUploadingSheets(false);
        return;
      }
      setUploadingSheets(false);
    }

    // Upload audio file
    let finalAudioUrl = audioUrl.trim() || undefined;
    if (audioFile) {
      try {
        const formData = new FormData();
        formData.append("files", audioFile);
        const audioRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!audioRes.ok) {
          const data = await audioRes.json();
          throw new Error(data.error || "Audio upload failed");
        }
        const audioData = await audioRes.json();
        finalAudioUrl = audioData.urls[0];
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Audio upload error");
        setSubmitting(false);
        return;
      }
    }

    const urlSheets = sheetMusicInput.split("\n").map((s) => s.trim()).filter(Boolean);

    // Build translations and romanization from preview if available
    const translations: Record<string, { title: string; artist?: string; lines: string[] }> = {};
    let romanization: string[] = [];

    if (previewReady) {
      if (previewEnTitle || previewEnLines.length > 0) {
        translations.en = {
          title: previewEnTitle,
          artist: previewEnArtist || undefined,
          lines: previewEnLines,
        };
      }
      romanization = previewRomanization;
    }

    const body = {
      title: title.trim(),
      artist: artist.trim(),
      category,
      tags: tagsInput.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean),
      youtubeUrl: youtubeUrl.trim() || undefined,
      audioUrl: finalAudioUrl,
      sheetMusicUrls: [...urlSheets, ...uploadedUrls],
      lyrics: lines.map((line) => ({ line, chords: [] as string[] })),
      romanization,
      translations,
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

  const lyricsLines = lyricsText.split("\n").map((l) => l.trim()).filter(Boolean);

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
            <label className="block text-sm font-medium mb-1">{t("upload.audioFile")}</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer bg-primary text-white hover:opacity-90 transition-opacity">
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAudioFile(file);
                    setAudioFileName(file.name);
                    e.target.value = "";
                  }}
                />
                {t("upload.audioFileSelect")}
              </label>
              {audioFileName && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>{audioFileName}</span>
                  <button
                    type="button"
                    onClick={() => { setAudioFile(null); setAudioFileName(""); }}
                    className="text-red-400 hover:text-red-600"
                  >
                    &times;
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted mt-1">{t("upload.audioFileHint")}</p>
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
            <label className="block text-sm font-medium mb-1">{t("upload.pianoSheetFile")}</label>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer bg-primary text-white hover:opacity-90 transition-opacity">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setSheetMusicFiles((prev) => [...prev, ...files]);
                  const newPreviews = files.map((f) => URL.createObjectURL(f));
                  setSheetMusicPreviews((prev) => [...prev, ...newPreviews]);
                  e.target.value = "";
                }}
              />
              {t("upload.pianoSheetSelect")}
            </label>
            <p className="text-xs text-muted mt-1">{t("upload.pianoSheetFileHint")}</p>
          </div>
          {sheetMusicPreviews.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {sheetMusicPreviews.map((src, idx) => (
                <div key={idx} className="relative group">
                  <img src={src} alt={`Sheet ${idx + 1}`} className="h-28 w-auto rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(src);
                      setSheetMusicFiles((prev) => prev.filter((_, i) => i !== idx));
                      setSheetMusicPreviews((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
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

        {/* OCR - Image Scan */}
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
                  const previewUrl = URL.createObjectURL(file);
                  setOcrPreview(previewUrl);

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

                    if (data.title && !title) setTitle(data.title);
                    if (data.artist && !artist) setArtist(data.artist);
                    if (data.lyrics?.length) {
                      const text = data.lyrics.map((l: { line: string }) => l.line || "").join("\n");
                      setLyricsText((prev) => prev ? prev + "\n" + text : text);
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

        {/* Lyrics */}
        <section className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">{t("upload.lyricsChords")}</h2>
          <p className="text-sm text-muted">{t("upload.lyricsBulkHint")}</p>
          <textarea
            value={lyricsText}
            onChange={(e) => { setLyricsText(e.target.value); setPreviewReady(false); }}
            rows={12}
            placeholder={"아리랑 아리랑 아라리요\n아리랑 고개로 넘어간다\n나를 버리고 가시는 님은\n십리도 못가서 발병난다"}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm"
          />
          {lyricsText.trim() && (
            <p className="text-xs text-muted">
              {lyricsLines.length}줄 입력됨
            </p>
          )}
        </section>

        {/* Preview Translate Button */}
        {!previewReady && (
          <button
            type="button"
            onClick={handlePreviewTranslate}
            disabled={translating || !lyricsText.trim() || !title.trim()}
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {translating ? "번역 중..." : "자동 번역 및 발음 확인하기 (영어로)"}
          </button>
        )}

        {/* Translation Preview (editable) */}
        {previewReady && (
          <section className="bg-card border-2 border-amber-300 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">번역 및 발음 미리보기</h2>
              <button
                type="button"
                onClick={handlePreviewTranslate}
                disabled={translating}
                className="text-sm text-amber-600 hover:underline font-medium"
              >
                {translating ? "번역 중..." : "다시 번역"}
              </button>
            </div>

            {/* English title & artist */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">English Title</label>
                <input
                  type="text"
                  value={previewEnTitle}
                  onChange={(e) => setPreviewEnTitle(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">English Artist</label>
                <input
                  type="text"
                  value={previewEnArtist}
                  onChange={(e) => setPreviewEnArtist(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Line by line: Korean → Romanization → English */}
            <div className="space-y-4">
              <label className="block text-xs font-medium text-muted">가사별 발음 & 영어 번역 (수정 가능)</label>
              {lyricsLines.map((line, idx) => (
                <div key={idx} className="border border-border rounded-lg p-3 space-y-1.5">
                  <p className="text-sm font-medium">{line}</p>
                  <input
                    type="text"
                    value={previewRomanization[idx] || ""}
                    onChange={(e) => {
                      const updated = [...previewRomanization];
                      updated[idx] = e.target.value;
                      setPreviewRomanization(updated);
                    }}
                    placeholder="발음"
                    className="w-full border border-border rounded px-2 py-1.5 text-sm text-primary italic"
                  />
                  <input
                    type="text"
                    value={previewEnLines[idx] || ""}
                    onChange={(e) => {
                      const updated = [...previewEnLines];
                      updated[idx] = e.target.value;
                      setPreviewEnLines(updated);
                    }}
                    placeholder="English translation"
                    className="w-full border border-border rounded px-2 py-1.5 text-sm text-muted"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {uploadingSheets ? t("upload.uploadingSheets") : submitting ? t("upload.submitting") : t("upload.submit")}
        </button>
      </form>
    </div>
  );
}

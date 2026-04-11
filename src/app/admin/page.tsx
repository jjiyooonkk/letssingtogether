"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/LangContext";
import { CATEGORIES } from "@/lib/constants";
import type { Song, Translation } from "@/lib/constants";

const ADMIN_PASSWORD = "lululala";

export default function AdminPage() {
  const { t } = useLang();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retranslating, setRetranslating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showGayo, setShowGayo] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("adminAuthed");
    if (saved === "true") setAuthed(true);
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchSongs();
    const stored = localStorage.getItem("showGayo");
    if (stored === "true") setShowGayo(true);
  }, [authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem("adminAuthed", "true");
      setPwError(false);
    } else {
      setPwError(true);
    }
  }

  function toggleGayo() {
    const next = !showGayo;
    setShowGayo(next);
    localStorage.setItem("showGayo", String(next));
    window.dispatchEvent(new StorageEvent("storage", { key: "showGayo", newValue: String(next) }));
  }

  async function fetchSongs() {
    try {
      const res = await fetch("/api/songs");
      const data = await res.json();
      setSongs(data);
    } catch {
      setMessage({ type: "error", text: "노래 목록을 불러올 수 없습니다." });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/songs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSongs(songs.filter((s) => s.id !== id));
      setDeleteConfirm(null);
      setMessage({ type: "success", text: "삭제되었습니다." });
    } catch {
      setMessage({ type: "error", text: "삭제에 실패했습니다." });
    }
  }

  async function handleSave() {
    if (!editingSong) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/songs/${editingSong.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSong),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setSongs(songs.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSong(null);
      setMessage({ type: "success", text: "저장되었습니다." });
    } catch {
      setMessage({ type: "error", text: "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndRetranslate() {
    if (!editingSong) return;
    setSaving(true);
    try {
      // 1. Save first
      const saveRes = await fetch(`/api/songs/${editingSong.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSong),
      });
      if (!saveRes.ok) throw new Error();

      // 2. Retranslate from English
      setRetranslating(true);
      const retransRes = await fetch(`/api/songs/${editingSong.id}/retranslate`, {
        method: "POST",
      });
      if (!retransRes.ok) {
        const data = await retransRes.json();
        throw new Error(data.error || "번역 실패");
      }
      const updated = await retransRes.json();
      setSongs(songs.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSong(null);
      setMessage({ type: "success", text: "저장 및 다국어 번역이 완료되었습니다." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "저장/번역 실패" });
    } finally {
      setSaving(false);
      setRetranslating(false);
    }
  }

  function updateEditing<K extends keyof Song>(field: K, value: Song[K]) {
    if (!editingSong) return;
    setEditingSong({ ...editingSong, [field]: value });
  }

  function updateEnTranslation(field: keyof Translation, value: string | string[]) {
    if (!editingSong) return;
    const en = editingSong.translations?.en || { title: "", lines: [] };
    const updated = { ...en, [field]: value };
    setEditingSong({
      ...editingSong,
      translations: { ...editingSong.translations, en: updated },
    });
  }

  function updateLyricLine(idx: number, field: "line" | "chords", value: string) {
    if (!editingSong) return;
    const lyrics = [...editingSong.lyrics];
    if (field === "chords") {
      lyrics[idx] = { ...lyrics[idx], chords: value.split(",").map((c) => c.trim()) };
    } else {
      lyrics[idx] = { ...lyrics[idx], line: value };
    }
    setEditingSong({ ...editingSong, lyrics });
  }

  function addLyricLine() {
    if (!editingSong) return;
    setEditingSong({
      ...editingSong,
      lyrics: [...editingSong.lyrics, { line: "", chords: [] }],
    });
  }

  function removeLyricLine(idx: number) {
    if (!editingSong) return;
    setEditingSong({
      ...editingSong,
      lyrics: editingSong.lyrics.filter((_, i) => i !== idx),
    });
  }

  // Login screen
  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">관리자 로그인</h1>
          <p className="text-muted text-sm mb-6">비밀번호를 입력하세요.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
              placeholder="비밀번호"
              className={`w-full border rounded-lg px-4 py-3 text-center ${pwError ? "border-red-400" : "border-border"}`}
              autoFocus
            />
            {pwError && <p className="text-red-500 text-sm">비밀번호가 틀렸습니다.</p>}
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">로딩 중...</p>
      </div>
    );
  }

  // Edit view
  if (editingSong) {
    const enTrans = editingSong.translations?.en || { title: "", lines: [] };

    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">노래 수정</h1>
          <button
            onClick={() => setEditingSong(null)}
            className="text-muted hover:text-foreground text-sm"
          >
            취소
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">기본 정보</h2>
            <div>
              <label className="block text-sm font-medium mb-1">제목</label>
              <input
                type="text"
                value={editingSong.title}
                onChange={(e) => updateEditing("title", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">아티스트</label>
              <input
                type="text"
                value={editingSong.artist}
                onChange={(e) => updateEditing("artist", e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select
                value={editingSong.category}
                onChange={(e) => updateEditing("category", e.target.value as Song["category"])}
                className="w-full border border-border rounded-lg px-3 py-2 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{t(`cat.${cat}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">태그</label>
              <input
                type="text"
                value={editingSong.tags.join(", ")}
                onChange={(e) =>
                  updateEditing("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                }
                className="w-full border border-border rounded-lg px-3 py-2"
                placeholder="쉼표로 구분"
              />
            </div>
          </section>

          {/* Media */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">미디어</h2>
            <div>
              <label className="block text-sm font-medium mb-1">YouTube URL</label>
              <input
                type="url"
                value={editingSong.youtubeUrl || ""}
                onChange={(e) => updateEditing("youtubeUrl", e.target.value || undefined)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">오디오 URL</label>
              <input
                type="url"
                value={editingSong.audioUrl || ""}
                onChange={(e) => updateEditing("audioUrl", e.target.value || undefined)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </section>

          {/* Lyrics */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">가사 & 코드</h2>
            {editingSong.lyrics.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-xs text-muted mt-3 w-6 text-right shrink-0">{idx + 1}</span>
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={line.line}
                    onChange={(e) => updateLyricLine(idx, "line", e.target.value)}
                    placeholder="가사"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={line.chords.join(", ")}
                    onChange={(e) => updateLyricLine(idx, "chords", e.target.value)}
                    placeholder="코드 (Am, G, Em)"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono text-primary"
                  />
                </div>
                {editingSong.lyrics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLyricLine(idx)}
                    className="text-red-400 hover:text-red-600 text-sm mt-2"
                  >
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addLyricLine}
              className="text-primary text-sm font-medium hover:underline"
            >
              + 줄 추가
            </button>
          </section>

          {/* Romanization */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">발음 (로마자)</h2>
            <textarea
              value={editingSong.romanization.join("\n")}
              onChange={(e) => updateEditing("romanization", e.target.value.split("\n"))}
              rows={6}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </section>

          {/* English Translation */}
          <section className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">영어 번역 (English)</h2>
              <p className="text-xs text-muted mt-1">영어 번역을 수정하면 다른 언어도 영어를 기반으로 자동 번역됩니다.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">영어 제목</label>
              <input
                type="text"
                value={enTrans.title || ""}
                onChange={(e) => updateEnTranslation("title", e.target.value)}
                placeholder="English title"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">영어 아티스트</label>
              <input
                type="text"
                value={enTrans.artist || ""}
                onChange={(e) => updateEnTranslation("artist", e.target.value)}
                placeholder="English artist"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">영어 가사 (줄바꿈으로 구분)</label>
              <textarea
                value={(enTrans.lines || []).join("\n")}
                onChange={(e) => updateEnTranslation("lines", e.target.value.split("\n"))}
                rows={Math.max(6, (enTrans.lines || []).length + 1)}
                placeholder="Line 1&#10;Line 2&#10;Line 3"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </section>

          {/* Save buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving && !retranslating ? "저장 중..." : "저장"}
            </button>
            <button
              onClick={handleSaveAndRetranslate}
              disabled={saving}
              className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {retranslating ? "번역 중..." : "저장 + 영어 기반 다국어 재번역"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">관리자 페이지</h1>
      <p className="text-muted mb-6">노래를 수정하거나 삭제할 수 있습니다.</p>

      {/* 가요 표시 토글 */}
      <div className="bg-card border border-border rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">가요 카테고리 표시</p>
          <p className="text-xs text-muted">홈 화면에서 가요 목록을 보이거나 숨깁니다.</p>
        </div>
        <button
          onClick={toggleGayo}
          className={`relative w-12 h-7 rounded-full transition-colors ${showGayo ? "bg-primary" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${showGayo ? "translate-x-5" : ""}`}
          />
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg mb-6 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right opacity-60 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {songs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted">등록된 노래가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {songs.map((song) => (
            <div key={song.id} className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-bold truncate">{song.title}</h2>
                <p className="text-sm text-muted truncate">
                  {song.artist} · {t(`cat.${song.category}`)} · 가사 {song.lyrics.length}줄
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingSong({ ...song });
                    setMessage(null);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-primary text-primary hover:bg-primary-light transition-colors"
                >
                  수정
                </button>
                {deleteConfirm === song.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600"
                    >
                      확인
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-2 text-sm font-medium rounded-lg border border-border text-muted hover:text-foreground"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(song.id)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

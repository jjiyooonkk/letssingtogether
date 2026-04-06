export const CATEGORIES = [
  "나그네의 노래",
  "아해노래",
  "흥얼송",
  "가곡",
  "가요",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface SongLine {
  line: string;
  chords: string[];
}

export interface Translation {
  title: string;
  artist?: string;
  lines: string[];
}

export const LANGUAGES: Record<string, string> = {
  en: "English",
  ja: "日本語",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  vi: "Tiếng Việt",
  th: "ไทย",
  tl: "Tagalog",
  id: "Bahasa Indonesia",
  ee: "Eʋegbe",
};

export interface Song {
  id: string;
  title: string;
  artist: string;
  category: Category;
  tags: string[];
  youtubeUrl?: string;
  audioUrl?: string;
  sheetMusicUrls?: string[];
  lyrics: SongLine[];
  translations: Record<string, Translation>;
  romanization: string[];
  createdAt: string;
}

import { getSongById, getSongs } from "@/lib/songs";
import { notFound } from "next/navigation";
import SongViewer from "./SongViewer";
import SongDetailHeader from "./SongDetailHeader";

export const dynamic = "force-dynamic";

export default async function SongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const song = await getSongById(id);

  if (!song) return notFound();

  // Calculate song number (전체 가나다순)
  const allSongs = await getSongs();
  const sorted = [...allSongs].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  const songNumber = sorted.findIndex((s) => s.id === song.id) + 1;

  return (
    <div>
      <SongDetailHeader song={song} songNumber={songNumber} />
      <SongViewer song={song} />
    </div>
  );
}

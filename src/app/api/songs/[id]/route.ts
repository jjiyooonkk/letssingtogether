import { getSongById } from "@/lib/songs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const song = getSongById(id);

  if (!song) {
    return Response.json({ error: "노래를 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json(song);
}

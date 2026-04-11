import { getSongById, updateSong, deleteSong } from "@/lib/songs";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const song = await getSongById(id);

  if (!song) {
    return Response.json({ error: "노래를 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json(song);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = await updateSong(id, body);
  if (!updated) {
    return Response.json({ error: "노래를 찾을 수 없습니다." }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath(`/songs/${id}`);

  return Response.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deleted = await deleteSong(id);
  if (!deleted) {
    return Response.json({ error: "노래를 찾을 수 없습니다." }, { status: 404 });
  }

  revalidatePath("/");

  return Response.json({ success: true });
}

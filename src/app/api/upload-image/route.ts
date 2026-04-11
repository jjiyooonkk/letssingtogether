import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

function useBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return Response.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const urls: string[] = [];
    const allowedTypes = ["image/", "audio/"];

    for (const file of files) {
      if (!allowedTypes.some((t) => file.type.startsWith(t))) {
        return Response.json(
          { error: "이미지 또는 오디오 파일만 업로드할 수 있습니다." },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() || "bin";
      const filename = `uploads/${randomUUID()}.${ext}`;

      if (useBlob()) {
        // Vercel: upload to Blob storage
        const blob = await put(filename, file, {
          access: "public",
          addRandomSuffix: false,
          contentType: file.type,
        });
        urls.push(blob.url);
      } else {
        // Local/Docker: write to public/uploads/
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });
        await writeFile(path.join(uploadsDir, `${randomUUID()}.${ext}`), buffer);
        urls.push(`/uploads/${path.basename(filename)}`);
      }
    }

    return Response.json({ urls });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json({ error: "업로드 실패" }, { status: 500 });
  }
}

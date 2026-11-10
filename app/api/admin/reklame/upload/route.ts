import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { isActiveAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Upload videa ide direktno iz preglednika u Blob (klijentski upload) — Vercel
// funkcija prima max ~4,5 MB, a reklame su 10–100 MB. Ovdje samo izdajemo token.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isActiveAdmin())) throw new Error("Nisi prijavljen.");
        if (!pathname.startsWith("reklame/")) throw new Error("Neispravna putanja.");
        return {
          allowedContentTypes: ["video/mp4", "video/quicktime", "image/jpeg", "image/png"],
          maximumSizeInBytes: 300 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async () => {
        /* ništa — popis se čita iz Bloba */
      }
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Greška" }, { status: 400 });
  }
}

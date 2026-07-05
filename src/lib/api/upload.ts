import { getAuthToken } from "@/lib/api/auth";

/** Hasil sukses `POST /api/uploads`. */
export type UploadResult = { id: string; url: string; name: string };

/**
 * Unggah satu file ke backend mock `/api/uploads`. Hanya untuk dipanggil di
 * browser — URL relatif, dan browser yang menyetel boundary multipart
 * Content-Type (jangan diset manual). Real cloud storage/auth = fork's job.
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.set("file", file);

  const token = await getAuthToken();
  const res = await fetch("/api/uploads", {
    method: "POST",
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Upload gagal");
  return res.json() as Promise<UploadResult>;
}

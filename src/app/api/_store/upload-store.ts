// Store generik in-memory untuk file yang diunggah lewat POST /api/uploads.
// Ganti dengan object storage nyata (mis. S3/GCS) di produksi.
export type UploadRecord = { name: string; type: string; base64: string };

let counter = 0;

export function createUploadStore() {
  const files = new Map<string, UploadRecord>();
  return {
    save(record: UploadRecord): { id: string } {
      const id = `u_${Date.now()}_${counter++}`;
      files.set(id, record);
      return { id };
    },
    get(id: string): UploadRecord | null {
      return files.get(id) ?? null;
    },
  };
}

export const uploadStore = createUploadStore();

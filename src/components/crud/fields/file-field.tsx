"use client";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/i18n-provider";
import { uploadFile } from "@/lib/api/upload";
import type { FieldProps } from "./index";

/**
 * Dropzone upload nyata (Task 2) — menggantikan mock v1 (FileReader → data-URL).
 * File dikirim ke `/api/uploads` (Task 1) via `uploadFile`; value RHF yang
 * disimpan adalah URL hasil unggah, bukan isi file itu sendiri. Storage cloud
 * sungguhan & otorisasi upload di luar backend mock ini = pekerjaan fork.
 */
export function FileField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { setValue } = useFormContext();
  const value = useWatch({ name }) as string | undefined;
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // `meta.accept` dipakai juga utk menebak jenis preview — cukup sederhana:
  // accept yang menyebut "image" dianggap gambar, sisanya tautan nama berkas.
  const isImage = Boolean(meta.accept?.includes("image"));

  async function handleFile(file: File) {
    setPending(true);
    try {
      const result = await uploadFile(file);
      setValue(name, result.url, { shouldDirty: true });
    } catch {
      toast.error(t.field.uploadFailed);
    } finally {
      setPending(false);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset input agar memilih file yang sama dua kali tetap memicu `onChange`.
    event.target.value = "";
    if (!file) return;
    void handleFile(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void handleFile(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPicker();
    }
  }

  function fileNameFromUrl(url: string): string {
    const last = url.split("/").pop();
    return last && last.length > 0 ? last : url;
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-input p-4 text-center text-sm text-muted-foreground"
      >
        {pending ? (
          <span>{t.field.uploading}</span>
        ) : value ? (
          isImage ? (
            // `<img>` biasa (BUKAN `next/image`) sengaja dipakai — sumber `value`
            // adalah URL upload dinamis (tak diketahui saat build, seperti kolom
            // gambar `ResourceTable`), tanpa dimensi tetap yang bisa dijamin.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-16 w-16 rounded object-cover" />
          ) : (
            <a
              href={value}
              className="underline"
              // Cegah klik tautan ikut membuka file picker (keduanya nested di dropzone).
              onClick={(event) => event.stopPropagation()}
            >
              {fileNameFromUrl(value)}
            </a>
          )
        ) : (
          <span>{t.field.dropzone}</span>
        )}
      </div>
      <input
        ref={inputRef}
        id={name}
        type="file"
        accept={meta.accept}
        onChange={handleInputChange}
        className="sr-only"
      />
    </div>
  );
}

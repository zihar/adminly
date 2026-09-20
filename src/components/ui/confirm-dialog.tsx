"use client"

import * as React from "react"
import { CircleHelp, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  variant?: "default" | "destructive"
  loading?: boolean
}

/**
 * Kotak konfirmasi siap-pakai di atas primitif `alert-dialog` — tanpa tombol
 * X dan tak bisa ditutup lewat klik di luar (lihat alert-dialog.tsx): sebuah
 * konfirmasi harus dijawab lewat Batal/Konfirmasi, bukan jalan pintas.
 * `onConfirm` TIDAK menutup dialog sendiri — pemanggil yang memegang
 * `open`/`onOpenChange` memutuskan kapan menutup (mis. setelah mutation sukses).
 */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const Icon = variant === "destructive" ? TriangleAlert : CircleHelp

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex-row items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
              variant === "destructive"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="size-4.5" aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5 pt-1">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" disabled={loading} />}>
            {cancelLabel}
          </AlertDialogClose>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmDialog }

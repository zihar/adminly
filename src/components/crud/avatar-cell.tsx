import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initialsOf, toneOf, type Tone } from "@/lib/tone";

// Kelas statis per tone (Tailwind tak bisa memindai nama kelas yang dirakit
// dinamis). Latar = campuran tipis token `--m<n>` ke permukaan kartu; teks
// tetap `text-foreground` supaya kontras tidak bergantung pada warna modul.
const TONE_BG: Record<Tone, string> = {
  1: "bg-[color-mix(in_oklab,var(--m1)_24%,var(--card))]",
  2: "bg-[color-mix(in_oklab,var(--m2)_24%,var(--card))]",
  3: "bg-[color-mix(in_oklab,var(--m3)_24%,var(--card))]",
  4: "bg-[color-mix(in_oklab,var(--m4)_24%,var(--card))]",
};

/** Sel kolom `render: "avatar"`: lingkaran inisial berwarna + nama (terpotong). */
export function AvatarCell({ name }: { name: string }) {
  const tone = toneOf(name);
  return (
    <div className="flex min-w-0 max-w-64 items-center gap-2">
      <Avatar size="sm" data-tone={tone}>
        <AvatarFallback
          className={`${TONE_BG[tone]} text-xs font-medium text-foreground`}
        >
          {initialsOf(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </div>
  );
}

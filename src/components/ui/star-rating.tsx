import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Оценка ${value} из 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < value ? "fill-accent text-accent" : "fill-border text-border",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}

/**
 * Заголовок секции. Ярлыка-надписи над заголовком нет намеренно: он повторял бы
 * сам заголовок. Всё, что нужно сказать дополнительно, живёт в description фактами.
 */
export function SectionHeading({
  title,
  description,
  align = "left",
  className,
  as: Tag = "h2",
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      <Tag className="text-3xl leading-[1.1] font-bold sm:text-4xl lg:text-[2.75rem]">{title}</Tag>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{description}</p>
      )}
    </div>
  );
}

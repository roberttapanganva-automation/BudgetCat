import { useState } from "react";
import { cn } from "../../lib/utils";

export function TransparentMascotImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className?: string;
  src: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={cn("inline-block text-sm font-black text-budget-text/70", className)}>
        {alt}
      </span>
    );
  }

  return (
    <img
      alt={alt}
      className={cn("h-auto w-full object-contain object-center", className)}
      onError={() => setFailed(true)}
      src={src}
    />
  );
}

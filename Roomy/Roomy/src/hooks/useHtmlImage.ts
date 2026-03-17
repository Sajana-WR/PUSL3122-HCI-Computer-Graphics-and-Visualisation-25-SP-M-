import { useEffect, useState } from "react";

const cache = new Map<string, HTMLImageElement>();

export function useHtmlImage(src: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;

    const cached = cache.get(src);
    if (cached) {
      queueMicrotask(() => setImage(cached));
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      cache.set(src, img);
      setImage(img);
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
    };

    return () => {
      cancelled = true;
    };
  }, [src]);

  return src ? image : null;
}

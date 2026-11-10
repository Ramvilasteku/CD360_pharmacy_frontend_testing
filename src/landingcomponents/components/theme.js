import { useEffect, useRef, useState } from 'react';

/* true once the element scrolls into view (IntersectionObserver). */
export default function useInView(threshold = 0.14, onEnter) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const cb = useRef(onEnter);
  cb.current = onEnter;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      if (cb.current) cb.current();
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setInView(true);
          if (cb.current) cb.current();
          io.unobserve(e.target);
        }
      });
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView];
}

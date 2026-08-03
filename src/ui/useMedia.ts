import { useSyncExternalStore } from "react";

/**
 * Подписка на media query. Через `useSyncExternalStore`, а не `useState` +
 * `useEffect`: первый рендер сразу знает ответ, и мобильная вёрстка не мигает
 * десктопной на старте.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

/** Телефон: у Tailwind это всё, что уже брейкпоинта `sm`. */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 639px)");
}

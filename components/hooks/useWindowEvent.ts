import { useEffect, useRef } from "react";

type EventHandler<T extends Event> = (event: T) => void;

export function useWindowEvent<T extends keyof WindowEventMap>(
  eventName: T,
  handler: EventHandler<WindowEventMap[T]>,
  options?: AddEventListenerOptions,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventHandler = (event: WindowEventMap[T]) => {
      handlerRef.current(event);
    };

    window.addEventListener(eventName, eventHandler, options);
    return () => window.removeEventListener(eventName, eventHandler, options);
  }, [eventName, options]);
}

export function useScroll(callback: (scrollY: number) => void, options?: AddEventListenerOptions) {
  useWindowEvent("scroll", () => callback(window.scrollY), options);
}

export function useResize(callback: () => void, options?: AddEventListenerOptions) {
  useWindowEvent("resize", callback, options);
}

export function useKeyDown(callback: (event: KeyboardEvent) => void, options?: AddEventListenerOptions) {
  useWindowEvent("keydown", callback, options);
}

export function useMessage(callback: (event: MessageEvent) => void, options?: AddEventListenerOptions) {
  useWindowEvent("message", callback, options);
}

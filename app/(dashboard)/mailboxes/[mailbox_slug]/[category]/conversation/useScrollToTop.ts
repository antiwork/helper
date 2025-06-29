import { useEffect, useState } from "react";

export const useScrollToTop = (
    scrollRef: React.RefObject<HTMLElement | null> & React.RefCallback<HTMLElement>
) => {
    const SCROLL_THRESHOLD = 100;
    const DEBOUNCE_DELAY = 100;
    const [show, setShow] = useState(false);

    useEffect(() => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) return;

        let timeoutId: NodeJS.Timeout;
        const handleScroll = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                const scrollTop = scrollElement.scrollTop;
                setShow(scrollTop > SCROLL_THRESHOLD);
            }, DEBOUNCE_DELAY);
        };

        scrollElement.addEventListener("scroll", handleScroll);
        return () => {
            scrollElement.removeEventListener("scroll", handleScroll);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [scrollRef]);

    const scrollToTop = () => {
        scrollRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return { show, scrollToTop };
};

import { ArrowLeft, ArrowRight } from "lucide-react";
import React, { createContext, useContext } from "react";
import { useGlobalEventListener } from "./useGlobalEventListener";

export enum CarouselDirection {
  LEFT = "left",
  RIGHT = "right",
}

type CarouselProviderProps<ItemType> = {
  currentIndex: number;
  setCurrentIndex: (newValue: number) => void;
  items: ItemType[];
};

type CarouselProps<ItemType> = {
  children: (item: ItemType) => React.JSX.Element | null;
};

type CarouselButtonProps = {
  direction: CarouselDirection;
  className?: string;
};

export function createCarousel<ItemType>() {
  const CarouselContext = createContext<CarouselProviderProps<ItemType>>({
    currentIndex: 0,
    setCurrentIndex: () => {},
    items: [],
  });

  const Carousel = ({ children }: CarouselProps<ItemType>) => {
    const { currentIndex, items } = useContext(CarouselContext);

    const currentItem = items[currentIndex];
    return <div className="flex flex-row items-center">{currentItem ? children(currentItem) : null}</div>;
  };

  const CarouselButton = ({ direction, className }: CarouselButtonProps) => {
    const { currentIndex, setCurrentIndex, items } = useContext(CarouselContext);

    useGlobalEventListener("keydown", (event) => {
      if (items.length <= 1) return;
      if (
        (event.code === "ArrowLeft" && direction === CarouselDirection.LEFT) ||
        (event.code === "ArrowRight" && direction === CarouselDirection.RIGHT)
      ) {
        advanceCarousel();
      }
    });

    if (items.length <= 1) return null;

    const advanceCarousel = () => {
      const delta = direction === CarouselDirection.LEFT ? -1 : 1;
      let newIndex = (currentIndex + delta) % items.length;
      if (newIndex < 0) {
        newIndex += items.length;
      }
      setCurrentIndex(newIndex);
    };

    const ArrowIcon = direction === CarouselDirection.LEFT ? ArrowLeft : ArrowRight;
    const ariaLabel = direction === CarouselDirection.LEFT ? "previous" : "next";

    return (
      <button
        onClick={advanceCarousel}
        className={`h-8 w-8 rounded-full bg-background ${className ?? ""}`}
        aria-label={ariaLabel}
      >
        <ArrowIcon className="mx-auto my-auto w-5" />
      </button>
    );
  };

  return { CarouselContext, Carousel, CarouselButton };
}

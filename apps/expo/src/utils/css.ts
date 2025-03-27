import { clsx, type ClassValue } from "clsx";
import { cssInterop } from "nativewind";
import { ColorSchemeName, StyleProp } from "react-native";
import { twMerge } from "tailwind-merge";

export const backgroundColor = (colorScheme: ColorSchemeName) => (colorScheme === "dark" ? "#280b0b" : "#fafafa");

export const cssIconInterop = (
  Icon: React.ComponentType<{ width?: number; height?: number; color?: string; style?: StyleProp<any> }>,
) => {
  cssInterop(Icon, {
    className: {
      target: "style",
      nativeStyleToProp: { width: true, height: true, color: true },
    },
  });
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

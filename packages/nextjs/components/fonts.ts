import localFont from "next/font/local";

const sundryRegular = localFont({
  src: [
    {
      path: "../public/fonts/Sundry-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Sundry-Regular.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-sundry-regular",
});

const sundryMedium = localFont({
  src: [
    {
      path: "../public/fonts/Sundry-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Sundry-Medium.woff",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-sundry-medium",
});

const sundryBold = localFont({
  src: [
    {
      path: "../public/fonts/Sundry-Bold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Sundry-Bold.woff",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-sundry-bold",
});

const sundryNarrowMedium = localFont({
  src: [
    {
      path: "../public/fonts/SundryNarrow-Medium.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/SundryNarrow-Medium.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sundry-narrow-medium",
});

const sundryNarrowBold = localFont({
  src: [
    {
      path: "../public/fonts/SundryNarrow-Bold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/SundryNarrow-Bold.woff",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-sundry-narrow-bold",
});

export { sundryRegular, sundryMedium, sundryBold, sundryNarrowMedium, sundryNarrowBold };

export const getUrlParams = (searchParams: Record<string, string | string[] | undefined>) =>
  new URLSearchParams(
    Object.entries(searchParams).flatMap(([key, val]) =>
      typeof val === "string" ? [[key, val]] : (val?.map((v) => [key, v]) ?? []),
    ),
  );

export const formatBytes = (bytes: number, decimals: number) => {
  // Taken from https://gist.github.com/zentala/1e6f72438796d74531803cc3833c039c
  if (bytes == 0) return "0 B";
  const k = 1024,
    dm = decimals || 2,
    sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

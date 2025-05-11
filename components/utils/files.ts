export const formatSizeHuman = (size: number, suffix = "B") => {
  const units = ["", "K", "M", "G"];
  for (const unit of units) {
    if (Math.abs(size) < 1024.0) {
      return `${size.toFixed(1)} ${unit}${suffix}`;
    }
    size /= 1024.0;
  }
  return `${size.toFixed(1)} T${suffix}`;
};

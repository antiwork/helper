import cx from "classnames";

type Props = {
  color: "primary" | "gumroad-pink";
};

export default function LoadingMessage({ color }: Props) {
  const loadingClasses = `absolute top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-${color}`;

  return (
    <div className="flex flex-col gap-2">
      <div className={cx("rounded-lg max-w-full border border-black bg-background text-foreground")}>
        <div className="relative p-4">
          <div className="relative h-4 w-20 overflow-hidden rounded-lg" data-testid="loading-spinner">
            <div className={`${loadingClasses} ball-1`}></div>
            <div className={`${loadingClasses} ball-2`}></div>
            <div className={`${loadingClasses} ball-3`}></div>
            <div className={`${loadingClasses} ball-4`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

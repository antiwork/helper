import { Button as BaseButton } from "@react-email/components";

export const Button = ({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) => {
  return (
    <BaseButton
      style={{
        backgroundColor: "hsl(0 67% 17%)",
        display: "inline-block",
        borderRadius: "0.5rem",
        paddingLeft: "1.25rem",
        paddingRight: "1.25rem",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
        textAlign: "center",
        fontSize: "0.875rem",
        fontWeight: "300",
        color: "hsl(0 0% 100%)",
        textDecoration: "none",
      }}
      className={className}
      href={href}
    >
      {children}
    </BaseButton>
  );
};

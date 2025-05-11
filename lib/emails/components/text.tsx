import { Text as BaseText } from "@react-email/components";

export const Text = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <BaseText
      style={{
        fontSize: "0.875rem",
        lineHeight: "1.5rem",
        color: "hsl(0 58% 10%)",
      }}
      className={className}
    >
      {children}
    </BaseText>
  );
};

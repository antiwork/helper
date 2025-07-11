import { SecretInput } from "@/components/secretInput";

const WidgetHMACSecret = ({ hmacSecret }: { hmacSecret: string }) => {
  return (
    <div>
      <SecretInput value={hmacSecret} ariaLabel="HMAC Secret" />
    </div>
  );
};

export default WidgetHMACSecret;

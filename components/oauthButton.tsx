import * as React from "react";
import { Button } from "@/components/ui/button";

export type OAuthButtonProps = {
  provider: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const OAuthButton = ({ provider, onClick }: OAuthButtonProps) => {
  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
  const providerImgSrc = `https://authjs.dev/img/providers/${provider}.svg`;

  return (
    <Button variant="outlined_subtle" onClick={onClick}>
      <img alt={providerName} height="24" width="24" src={providerImgSrc} />
      <span className="grow">Log in with {providerName}</span>
    </Button>
  );
};

export default OAuthButton;

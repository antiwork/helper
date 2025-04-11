import { UserProfile } from "@clerk/nextjs";

export default function MobileProfilePage() {
  return (
    <div className="flex h-dvh w-full flex-col">
      <UserProfile
        routing="hash"
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "max-w-none w-full rounded-none",
            scrollBox: "rounded-none",
          },
        }}
      />
    </div>
  );
}

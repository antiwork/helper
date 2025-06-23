import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex flex-col space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Input type="color" value={value} onChange={onChange} className="h-10 w-20 p-1" />
        <Input type="text" value={value} onChange={onChange} className="w-[200px]" />
      </div>
    </div>
  );
}

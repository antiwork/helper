import { forwardRef } from "react";
import { onModEnterKeyboardEvent } from "@/components/onModEnterKeyboardEvent";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  name: string;
  value: string;
  onChange: (newValue: string) => void;
  onModEnter?: () => void;
};

const LabeledInput = forwardRef<HTMLInputElement, Props>(({ name, value, onChange, onModEnter }, ref) => (
  <div className="relative flex grow overflow-hidden rounded border border-border focus-within:border-border">
    <Label
      htmlFor={name}
      className="mb-0 min-w-10 flex items-center justify-center border-r border-border bg-muted p-1 text-sm text-muted-foreground"
    >
      {name}
    </Label>
    <Input
      ref={ref}
      type="text"
      name={name}
      className="text-sm border-none rounded-none focus:border-transparent focus:outline-hidden focus:ring-transparent"
      value={value}
      onKeyDown={onModEnter ? onModEnterKeyboardEvent(onModEnter) : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
));
LabeledInput.displayName = "LabeledInput";

export default LabeledInput;

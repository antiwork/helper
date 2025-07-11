"use client";

import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  children: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
}

export function ConfirmationDialog({
  message,
  onConfirm,
  children,
  confirmLabel,
  confirmVariant = "destructive",
}: ConfirmationDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogDescription className="text-base">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
          >
            No
          </Button>
          <Button
            variant={confirmVariant}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {confirmLabel ? confirmLabel : "Yes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

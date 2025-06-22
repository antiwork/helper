"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ConfirmationDialogProps {
  message: string
  onConfirm: () => void
  onCancel?: () => void
  title?: string
  triggerText?: string
  triggerVariant?: "destructive" | "link" | "default" | "destructive_outlined" | "outlined" | "outlined_subtle" | "subtle" | "ghost" | "bare" | "bright" | "sidebar" | "sidebar-subtle" | "sidebar-link"
  children?: React.ReactNode
}

export function ConfirmationDialog({
  message,
  onConfirm,
  onCancel,
  title,
  triggerText = "Delete",
  triggerVariant = "destructive",
  children,
}: ConfirmationDialogProps) {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={triggerVariant}>
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-base">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={(e)=>{
                e.preventDefault();
                handleCancel();
            }}
          >
            No
          </Button>
          <Button 
            variant="default"
            onClick={(e)=>{
                e.preventDefault();
                handleConfirm()
            }}>
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
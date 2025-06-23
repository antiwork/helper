"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const macroFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  content: z.string().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  shortcut: z.string().max(20, "Shortcut must be less than 20 characters").optional(),
  isGlobal: z.boolean().default(false),
});

type MacroFormData = z.infer<typeof macroFormSchema>;

type Macro = {
  slug: string;
  name: string;
  content: string;
  description?: string;
  shortcut?: string;
  isGlobal: boolean;
};

interface MacroFormProps {
  macro?: Macro;
  mailboxSlug: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MacroForm({ macro, mailboxSlug, onSuccess, onCancel }: MacroFormProps) {
  const form = useForm<MacroFormData>({
    resolver: zodResolver(macroFormSchema),
    defaultValues: {
      name: macro?.name || "",
      content: macro?.content || "",
      description: macro?.description || "",
      shortcut: macro?.shortcut || "",
      isGlobal: macro?.isGlobal || false,
    },
  });

  const createMacro = api.mailbox.macros.create.useMutation({
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create macro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMacro = api.mailbox.macros.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to update macro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MacroFormData) => {
    const finalData = {
      mailboxSlug,
      ...data,
    };

    if (macro) {
      updateMacro.mutate({ slug: macro.slug, ...finalData });
    } else {
      createMacro.mutate(finalData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Welcome Message" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shortcut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shortcut (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., welcome, kb" {...field} />
                </FormControl>
                <FormDescription>Quick shortcut to find this macro</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of when to use this macro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter your macro content here..." className="min-h-32 resize-none" {...field} />
              </FormControl>
              <FormDescription>{form.watch("content")?.length || 0}/5000 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isGlobal"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Global Macro</FormLabel>
                <FormDescription>Make this macro available to all team members</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-2">
          <Button type="button" variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMacro.isPending || updateMacro.isPending}>
            {createMacro.isPending || updateMacro.isPending ? "Saving..." : macro ? "Update Macro" : "Create Macro"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

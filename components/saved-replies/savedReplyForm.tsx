"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const savedReplyFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  content: z.string().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  shortcut: z.string().max(20, "Shortcut must be less than 20 characters").optional(),
});

type SavedReplyFormData = z.infer<typeof savedReplyFormSchema>;

type SavedReply = {
  slug: string;
  name: string;
  content: string;
  description?: string;
  shortcut?: string;
};

interface SavedReplyFormProps {
  macro?: SavedReply;
  mailboxSlug: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SavedReplyForm({ macro, mailboxSlug, onSuccess, onCancel }: SavedReplyFormProps) {
  const form = useForm<SavedReplyFormData>({
    resolver: zodResolver(savedReplyFormSchema),
    defaultValues: {
      name: macro?.name || "",
      content: macro?.content || "",
      description: macro?.description || "",
      shortcut: macro?.shortcut || "",
    },
  });

  const createSavedReply = api.mailbox.savedReplies.create.useMutation({
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create saved reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSavedReply = api.mailbox.savedReplies.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to update saved reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SavedReplyFormData) => {
    const finalData = {
      mailboxSlug,
      ...data,
    };

    if (macro) {
      updateSavedReply.mutate({ slug: macro.slug, ...finalData });
    } else {
      createSavedReply.mutate(finalData);
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
                <FormDescription>Quick shortcut to find this saved reply</FormDescription>
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
                <Input placeholder="Brief description of when to use this saved reply" {...field} />
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
                <Textarea placeholder="Enter your saved reply content here..." className="min-h-32 resize-none" {...field} />
              </FormControl>
              <FormDescription>{form.watch("content")?.length || 0}/5000 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-2">
          <Button type="button" variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSavedReply.isPending || updateSavedReply.isPending}>
            {createSavedReply.isPending || updateSavedReply.isPending ? "Saving..." : macro ? "Update Saved Reply" : "Create Saved Reply"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

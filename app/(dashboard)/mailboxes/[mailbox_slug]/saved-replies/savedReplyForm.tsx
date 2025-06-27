"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/components/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type SavedReply = {
  slug: string;
  name: string;
  content: string;
};

interface SavedReplyFormProps {
  savedReply?: SavedReply;
  mailboxSlug: string;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function SavedReplyForm({ savedReply, mailboxSlug, onSuccess, onCancel, onDelete }: SavedReplyFormProps) {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
        content: z.string().min(1, "Content is required"),
      }),
    ),
    defaultValues: {
      name: savedReply?.name || "",
      content: savedReply?.content || "",
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

  const deleteSavedReply = api.mailbox.savedReplies.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Saved reply deleted successfully", variant: "success" });
      onDelete?.();
    },
    onError: (error) => {
      toast({ title: "Failed to delete saved reply", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: { name: string; content: string }) => {
    const finalData = {
      mailboxSlug,
      ...data,
    };

    if (savedReply) {
      updateSavedReply.mutate({ slug: savedReply.slug, ...finalData });
    } else {
      createSavedReply.mutate(finalData);
    }
  };

  const handleDelete = () => {
    if (savedReply) {
      deleteSavedReply.mutate({ mailboxSlug, slug: savedReply.slug });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Welcome Message" {...field} />
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
                <Textarea
                  placeholder="Enter your saved reply content here..."
                  className="min-h-32 resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          {savedReply && onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={deleteSavedReply.isPending}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete saved reply</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{savedReply.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <Button type="button" variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSavedReply.isPending || updateSavedReply.isPending}>
              {createSavedReply.isPending || updateSavedReply.isPending ? "Saving..." : savedReply ? "Update" : "Add"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

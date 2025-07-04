"use client"

import type React from "react"
import { useState } from "react"
import { X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/hooks/use-toast"
import { api } from "@/trpc/react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

export type CommonIssue = {
  id: number;
  slug: string;
  title: string | null;
  keywords: string[] | null; 
  createdAt: Date;
  updatedAt: Date;
  mailboxId: number;
  createdByUserId: string | null;
  createdByDisplayName: string;
  mailboxName: string;
};

interface CommonIssueFormProps {
  commonIssue?: CommonIssue
  onSuccess: () => void
  onCancel: () => void
  onDelete?: () => void
  mailboxSlug: string
}

export function CommonIssueForm({ commonIssue, onSuccess,mailboxSlug, onCancel, onDelete }: CommonIssueFormProps) {
  const [newKeyword, setNewKeyword] = useState("")
  const form = useForm({
    resolver: zodResolver(
      z.object({
        title: z.string().min(1, "Title is required"),
        keywords: z.array(z.string().min(1, "Keyword is required")).min(1),
      }),
    ),
    defaultValues: {
      title: commonIssue?.title || "",
      keywords: commonIssue?.keywords || [],
    },
  });

  const keywords = form.watch("keywords") || [];

  const createCommonIssue = api.mailbox.commonIssues.create.useMutation({
      onSuccess: () => {
        onSuccess()
        form.reset()
      },
      onError: (error) => {
        toast({
          title: "Failed to create saved reply",
          description: error.message,
          variant: "destructive",
        });
      },
    })

  const updateCommonIssue = api.mailbox.commonIssues.update.useMutation({
    onSuccess: () => {
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: "Failed to update saved reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCommonIssue = api.mailbox.commonIssues.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Saved reply deleted successfully", variant: "success" });
      onDelete?.();
    },
    onError: (error) => {
      toast({ title: "Failed to delete saved reply", description: error.message, variant: "destructive" });
    },
  });

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = newKeyword.trim();
      if (!trimmed) return;
      if (form.getValues("keywords").includes(trimmed)) return;

      form.setValue("keywords", [...form.getValues("keywords"), trimmed]);
      setNewKeyword("");
    }
  }

  const handleSubmit = (data: { title: string, keywords: string[] }) => {

    const finalData = {
      title: data.title.trim(),
      keywords: data.keywords,
      mailboxSlug
    }

    if(commonIssue) {
      updateCommonIssue.mutate({ slug:commonIssue.slug, ...finalData })
    } else {
      createCommonIssue.mutate(finalData)
    }
  }

  const handleDelete = () => {
    if (!commonIssue || !onDelete) return
    deleteCommonIssue.mutate({ mailboxSlug, slug: commonIssue.slug })
    onDelete()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
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
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keywords</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      id="keywords"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={handleKeywordInputKeyDown}
                      placeholder="Add a keyword..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={()=>{
                        const trimmed = newKeyword.trim();
                        if (!trimmed) return;
                        if (field.value.includes(trimmed)) return;

                        field.onChange([...field.value, trimmed]);
                        setNewKeyword("");
                      }}
                      disabled={!newKeyword.trim()}
                      className="shrink-0 bg-transparent"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {keywords.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {keywords.length} keyword{keywords.length !== 1 ? "s" : ""} added
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <Badge key={index} className="flex items-center gap-1 text-sm py-1 px-2">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => {
                        const updatedKeywords = keywords.filter((k) => k !== keyword);
                        form.setValue("keywords", updatedKeywords);
                      }}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {commonIssue && onDelete && (
            <Button type="button" variant="destructive_outlined" onClick={handleDelete} disabled={deleteCommonIssue.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onCancel} variant="outlined">
            Cancel
          </Button>
          <Button type="submit">
            {createCommonIssue.isPending || updateCommonIssue.isPending ? "Saving..." : commonIssue ? "Update" : "Create"}
          </Button>
        </div>
      </div>
      </form>
    </Form>
  )
}



{/* <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter issue title..."
          disabled={isLoading}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a brief description of the issue..."
          disabled={isLoading}
          rows={3}
          className="w-full resize-none"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="keywords">Keywords *</Label>
        <div className="flex gap-2">
          <Input
            id="keywords"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeywordInputKeyDown}
            placeholder="Add a keyword..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={handleAddKeyword}
            disabled={!newKeyword.trim() || isLoading}
            className="shrink-0 bg-transparent"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {keywords.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {keywords.length} keyword{keywords.length !== 1 ? "s" : ""} added
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <Badge key={index} className="flex items-center gap-1 text-sm py-1 px-2">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {commonIssue && onDelete && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : commonIssue ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form> */}
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

type CommonIssue = {
  slug: string
  title: string
  keywords: string[]
  description?: string
  usageCount: number
}

interface CommonIssueFormProps {
  commonIssue?: CommonIssue
  onSuccess: (issue: Omit<CommonIssue, "slug" | "usageCount" | "createdAt">) => void
  onCancel: () => void
  onDelete?: () => void
  mailboxSlug: string
}

export function CommonIssueForm({ commonIssue, onSuccess,mailboxSlug, onCancel, onDelete }: CommonIssueFormProps) {
  const [title, setTitle] = useState(commonIssue?.title || "")
  const [keywords, setKeywords] = useState<string[]>(commonIssue?.keywords || [])
  const [newKeyword, setNewKeyword] = useState("")
  const [description, setDescription] = useState(commonIssue?.description || "")
  const [isLoading, setIsLoading] = useState(false)

  const handleAddKeyword = () => {
    const trimmedKeyword = newKeyword.trim().toLowerCase()
    if (trimmedKeyword && !keywords.map((k) => k.toLowerCase()).includes(trimmedKeyword)) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword("")
    }
  }

  const createCommonIssue = api.mailbox.commonIssues.create.useMutation({
      onSuccess: () => {
        toast({
          title: "Common issue created successfully",
          variant: "success",
        });
      },
      onError: (error) => {
        toast({
          title: "Failed to create saved reply",
          description: error.message,
          variant: "destructive",
        });
      },
    })

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setKeywords(keywords.filter((keyword) => keyword !== keywordToRemove))
  }

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }

    if (keywords.length === 0) {
      toast({ title: "At least one keyword is required", variant: "destructive" })
      return
    }
    const finalData = {
        title: title.trim(),
        keywords,
        mailboxSlug
    }

    setIsLoading(true)

    createCommonIssue.mutate(finalData)
    
    onSuccess({
      title: title.trim(),
      keywords,
      description: description.trim() || undefined,
    })

    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!commonIssue || !onDelete) return

    if (!confirm("Are you sure you want to delete this common issue?")) {
      return
    }

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300))

    onDelete()
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
    </form>
  )
}
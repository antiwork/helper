"use client"

import { Copy, Plus, Search, Tag } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/hooks/use-toast"
import { CommonIssueForm } from "./commonIssueForm"
import { useParams } from "next/navigation"
import { api } from "@/trpc/react"

type CommonIssue = {
  slug: string
  title: string
  keywords: string[]
  description?: string
  usageCount: number
}

// Demo data
const DEMO_COMMON_ISSUES: CommonIssue[] = [
  {
    slug: "login-problems",
    title: "User Cannot Login to Account",
    keywords: ["login", "password", "authentication", "access", "signin"],
    description: "Common issues related to user authentication and login problems",
    usageCount: 45,
  },
  {
    slug: "payment-failed",
    title: "Payment Processing Failures",
    keywords: ["payment", "billing", "credit card", "transaction", "failed", "declined"],
    description: "Issues with payment processing and billing",
    usageCount: 32,
  },
  {
    slug: "email-delivery",
    title: "Email Not Being Delivered",
    keywords: ["email", "delivery", "spam", "inbox", "notifications"],
    usageCount: 28,
  },
  {
    slug: "slow-performance",
    title: "Application Running Slowly",
    keywords: ["performance", "slow", "loading", "timeout", "speed"],
    description: "Performance related issues and slow loading times",
    usageCount: 19,
  },
  {
    slug: "mobile-app-crash",
    title: "Mobile App Crashes on Startup",
    keywords: ["mobile", "crash", "startup", "app", "android", "ios"],
    usageCount: 15,
  },
  {
    slug: "data-sync-issues",
    title: "Data Not Syncing Between Devices",
    keywords: ["sync", "data", "devices", "cloud", "backup"],
    description: "Problems with data synchronization across multiple devices",
    usageCount: 12,
  },
  {
    slug: "subscription-renewal",
    title: "Subscription Auto-Renewal Problems",
    keywords: ["subscription", "renewal", "billing", "auto-pay", "expired"],
    usageCount: 8,
  },
  {
    slug: "file-upload-error",
    title: "Cannot Upload Files or Documents",
    keywords: ["upload", "files", "documents", "attachment", "error"],
    usageCount: 6,
  },
]

export default function CommonIssuesPage() {
  const params = useParams();
  const mailboxSlug = params.mailbox_slug as string;
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>(DEMO_COMMON_ISSUES)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCommonIssue, setEditingCommonIssue] = useState<CommonIssue | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  const { data: commonIssuesList } = api.mailbox.commonIssues.list.useQuery({
    mailboxSlug
  })

  // Filter common issues based on search
  const filteredCommonIssues = commonIssues.filter((issue) => {
    if (!debouncedSearchTerm) return true
    const searchLower = debouncedSearchTerm.toLowerCase()
    return (
      issue.title.toLowerCase().includes(searchLower) ||
      issue.keywords.some((keyword) => keyword.toLowerCase().includes(searchLower)) ||
      issue.description?.toLowerCase().includes(searchLower)
    )
  })

  const handleCreateSuccess = (newIssue: Omit<CommonIssue, "slug" | "usageCount" | "createdAt">) => {
    const issue: CommonIssue = {
      ...newIssue,
      slug: `issue-${Date.now()}`,
      usageCount: 0,
    }
    setCommonIssues((prev) => [issue, ...prev])
    setShowCreateDialog(false)
    toast({ title: "Common issue created successfully" })
  }

  const handleEditSuccess = (updatedIssue: Omit<CommonIssue, "slug" | "usageCount" | "createdAt">) => {
    if (!editingCommonIssue) return

    setCommonIssues((prev) =>
      prev.map((issue) => (issue.slug === editingCommonIssue.slug ? { ...issue, ...updatedIssue } : issue)),
    )
    setEditingCommonIssue(null)
    toast({ title: "Common issue updated successfully" })
  }

  const handleDelete = (slug: string) => {
    setCommonIssues((prev) => prev.filter((issue) => issue.slug !== slug))
    setEditingCommonIssue(null)
    toast({ title: "Common issue deleted successfully" })
  }

  const handleCopyKeywords = async (keywords: string[]) => {
    try {
      await navigator.clipboard.writeText(keywords.join(", "))
      toast({ title: "Keywords copied to clipboard" })
    } catch (_error) {
      toast({ title: "Failed to copy keywords", variant: "destructive" })
    }
  }

  const hasIssuesOrSearch = filteredCommonIssues.length > 0 || searchTerm.length > 0

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-2xl font-semibold">Common Issues</h1>
          {hasIssuesOrSearch && (
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search common issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New common issue
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-6 p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-14" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCommonIssues.map((commonIssue) => (
              <Card
                key={commonIssue.slug}
                className="hover:shadow-md transition-shadow cursor-pointer flex flex-col group"
                onClick={() => setEditingCommonIssue(commonIssue)}
                data-testid="common-issue-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {commonIssue.title}
                      </CardTitle>
                      {commonIssue.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{commonIssue.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopyKeywords(commonIssue.keywords)
                      }}
                      data-testid="copy-button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="h-4 w-4" data-testid="copy-icon" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="flex-1 mb-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {commonIssue.keywords.slice(0, 6).map((keyword, index) => (
                        <Badge key={index} className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {keyword}
                        </Badge>
                      ))}
                      {commonIssue.keywords.length > 6 && (
                        <Badge className="text-xs">
                          +{commonIssue.keywords.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
                    <span>{commonIssue.keywords.length} keywords</span>
                    <span>Used {commonIssue.usageCount} times</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredCommonIssues.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm ? "No common issues found matching your search" : "No common issues yet"}
            </div>
            {!searchTerm && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first common issue
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New common issue</DialogTitle>
            <DialogDescription>
              Create a common issue with keywords to help categorize and identify similar problems.
            </DialogDescription>
          </DialogHeader>
          <CommonIssueForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateDialog(false)} mailboxSlug={mailboxSlug} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingCommonIssue && (
        <Dialog open={!!editingCommonIssue} onOpenChange={() => setEditingCommonIssue(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit common issue</DialogTitle>
              <DialogDescription>Update your common issue and keywords.</DialogDescription>
            </DialogHeader>
            <CommonIssueForm
              commonIssue={editingCommonIssue}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingCommonIssue(null)}
              onDelete={() => handleDelete(editingCommonIssue.slug)}
              mailboxSlug={mailboxSlug}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
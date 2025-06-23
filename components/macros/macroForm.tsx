"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/components/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

const macroFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  content: z.string().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  shortcut: z.string().max(20, "Shortcut must be less than 20 characters").optional(),
  category: z.string().max(50, "Category must be less than 50 characters").optional(),
  isGlobal: z.boolean().default(false),
});

type MacroFormData = z.infer<typeof macroFormSchema>;

type Macro = {
  slug: string;
  name: string;
  content: string;
  description?: string;
  shortcut?: string;
  category?: string;
  isGlobal: boolean;
};

interface MacroFormProps {
  macro?: Macro;
  mailboxSlug: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const MACRO_VARIABLES = [
  { key: "{{customer_name}}", label: "Customer Name", description: "The customer's name or 'there' if not available" },
  { key: "{{customer_email}}", label: "Customer Email", description: "The customer's email address" },
  { key: "{{agent_name}}", label: "Agent Name", description: "Your full name" },
  { key: "{{agent_first_name}}", label: "Agent First Name", description: "Your first name" },
  { key: "{{conversation_subject}}", label: "Subject", description: "The conversation subject line" },
  { key: "{{mailbox_name}}", label: "Mailbox Name", description: "The name of the current mailbox" },
  { key: "{{today}}", label: "Today's Date", description: "Current date in local format" },
  { key: "{{company_name}}", label: "Company Name", description: "Your company name" },
];

const PRESET_CATEGORIES = [
  "greeting",
  "closing",
  "troubleshooting",
  "billing",
  "technical",
  "follow-up",
  "escalation",
  "apology",
  "confirmation",
  "information",
];

export function MacroForm({ macro, mailboxSlug, onSuccess, onCancel }: MacroFormProps) {
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const form = useForm<MacroFormData>({
    resolver: zodResolver(macroFormSchema),
    defaultValues: {
      name: macro?.name || "",
      content: macro?.content || "",
      description: macro?.description || "",
      shortcut: macro?.shortcut || "",
      category: macro?.category || "",
      isGlobal: macro?.isGlobal || false,
    },
  });

  const { data: categories } = api.mailbox.macros.categories.useQuery({ mailboxSlug });

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

  const { mutateAsync: processContent } = api.mailbox.macros.processContent.useMutation();

  const insertVariable = (variable: string) => {
    const content = form.getValues("content");
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.slice(0, start) + variable + content.slice(end);
      form.setValue("content", newContent);

      setTimeout(() => {
        textarea.setSelectionRange(start + variable.length, start + variable.length);
        textarea.focus();
      }, 0);
    } else {
      form.setValue("content", content + variable);
    }
  };

  const handlePreview = async () => {
    const content = form.getValues("content");
    if (!content.trim()) return;

    try {
      const result = await processContent({ mailboxSlug, content });
      toast({
        title: "Preview",
        description: result.processedContent,
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: "Preview failed",
        description: "Could not process macro variables",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: MacroFormData) => {
    const finalData = {
      mailboxSlug,
      ...data,
      category: showCustomCategory ? customCategory : data.category,
    };

    if (macro) {
      updateMacro.mutate({ slug: macro.slug, ...finalData });
    } else {
      createMacro.mutate(finalData);
    }
  };

  const allCategories = [...PRESET_CATEGORIES, ...(categories || []).filter((cat): cat is string => Boolean(cat)).filter((cat) => !PRESET_CATEGORIES.includes(cat))];

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

        <div className="space-y-2">
          <Label>Category (Optional)</Label>
          <div className="flex items-center space-x-2">
            <Select
              value={showCustomCategory ? "custom" : form.watch("category")}
              onValueChange={(value) => {
                if (value === "custom") {
                  setShowCustomCategory(true);
                  form.setValue("category", "");
                } else {
                  setShowCustomCategory(false);
                  form.setValue("category", value);
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select or create category" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.filter((category): category is string => Boolean(category)).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Create new category
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {showCustomCategory && (
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-48"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomCategory(false);
                    setCustomCategory("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter your macro content here..." className="min-h-32 resize-none" {...field} />
              </FormControl>
              <div className="flex items-center justify-between">
                <FormDescription>{form.watch("content")?.length || 0}/5000 characters</FormDescription>
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  onClick={handlePreview}
                  disabled={!form.watch("content")?.trim()}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Variables</CardTitle>
            <CardDescription>Click to insert dynamic variables into your macro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {MACRO_VARIABLES.map((variable) => (
                <Badge
                  key={variable.key}
                  variant="gray"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => insertVariable(variable.key)}
                  title={variable.description}
                >
                  {variable.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

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

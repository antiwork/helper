import { TagIcon } from "@heroicons/react/24/outline";
import { Check } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TopicFilter({
  selectedTopics,
  onChange,
}: {
  selectedTopics: number[];
  onChange: (topics: number[]) => void;
}) {
  const params = useParams<{ mailbox_slug: string }>();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Topics API has been removed, using empty array as fallback
  const topics: { id: number; name: string; parentId: number | null }[] = [];

  const parentTopics = topics.filter((t) => !t.parentId);
  const subtopicsByParent = topics.reduce<Record<number, (typeof topics)[number][]>>((acc, topic) => {
    if (topic.parentId) {
      acc[topic.parentId] ??= [];
      acc[topic.parentId]?.push(topic);
    }
    return acc;
  }, {});

  const selectedSubtopics = topics.filter((t) => selectedTopics.includes(t.id) && t.parentId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={selectedTopics.length ? "bright" : "outlined_subtle"} className="whitespace-nowrap">
          <TagIcon className="h-4 w-4 mr-2" />
          {selectedSubtopics.length === 1
            ? selectedSubtopics[0]?.name
            : selectedSubtopics.length
              ? `${selectedSubtopics.length} topics`
              : "Topic"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search topics..." value={searchTerm} onValueChange={setSearchTerm} />
          <div className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No topics found</CommandEmpty>
            {parentTopics
              .filter((parent) => {
                const subtopics = subtopicsByParent[parent.id] ?? [];
                return (
                  parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  subtopics.some((sub) => sub.name.toLowerCase().includes(searchTerm.toLowerCase()))
                );
              })
              .map((parent) => {
                const subtopics = subtopicsByParent[parent.id] ?? [];
                const filteredSubtopics = subtopics.filter((sub) =>
                  sub.name.toLowerCase().includes(searchTerm.toLowerCase()),
                );

                if (filteredSubtopics.length === 0 && !parent.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                  return null;
                }

                return (
                  <CommandGroup key={parent.id} heading={parent.name}>
                    {filteredSubtopics.map((subtopic) => (
                      <CommandItem
                        key={subtopic.id}
                        onSelect={() => {
                          const isSelected = selectedTopics.includes(subtopic.id);
                          onChange(
                            isSelected
                              ? selectedTopics.filter((t) => t !== subtopic.id)
                              : [...selectedTopics, subtopic.id],
                          );
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedTopics.includes(subtopic.id) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <span className="truncate">{subtopic.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

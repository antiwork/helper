"use client"

import { FileText, Book, FileCode, MessageSquare } from "lucide-react"

export default function KnowledgeBank() {
  const knowledgeItems = [
    { icon: FileText, label: "Policies", color: "bg-amber-400/10 text-amber-400" },
    { icon: Book, label: "Product Docs", color: "bg-green-400/10 text-green-400" },
    { icon: FileCode, label: "Technical Specs", color: "bg-blue-400/10 text-blue-400" },
    { icon: MessageSquare, label: "Common Responses", color: "bg-purple-400/10 text-purple-400" },
  ]

  return (
    <div className="p-6 rounded-lg bg-[#2B0808] border border-burgundy-700">
      <div className="flex items-center mb-6">
        <Book className="h-6 w-6 text-amber-400 mr-3" />
        <h3 className="text-lg font-medium text-white">Knowledge Bank</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {knowledgeItems.map((item, index) => (
          <div
            key={index}
            className="bg-[#3D1818] p-4 rounded-lg border border-burgundy-700 transition-all duration-300 hover:border-amber-500/50"
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="ml-3 text-sm font-medium">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

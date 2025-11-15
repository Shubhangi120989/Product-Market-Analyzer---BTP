"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Send } from "lucide-react"
// import type { CompetitorProduct } from "@/lib/types"
import { IMessage } from "@/models/message.model"
import axios from "axios"
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { ICompeditor } from "@/models/competitor.model"


export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("query")
  const [messages, setMessages] = useState<IMessage[]>([])
  const [competitors, setCompetitors] = useState<ICompeditor[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(true)
  const [isLoadingResponse, setIsLoadingResponse] = useState(false)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [selectedCompetitor, setSelectedCompetitor] = useState<ICompeditor | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/getProductChats/${id}?page=1&limit=10`)
        const data = response.data
        setMessages(data.messages.docs)
        setHasMoreMessages(data.messages.hasMore)
      } catch (error) {
        console.error("Error fetching messages:", error)
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingMessages(false)
      }
    }

    if (activeTab === "query") {
      fetchMessages()
    }

    // Fetch competitors when on competitor tab
    const fetchCompetitors = async () => {
      try {
        const response = await axios.post(`/api/getCompetitiorProducts/${id}`)
        const data = response.data.compeditors
        setCompetitors(data)
      } catch (error) {
        console.error("Error fetching competitors:", error)
        toast({
          title: "Error",
          description: "Failed to load competitor data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCompetitors(false)
      }
    }

    if (activeTab === "competitors") {
      fetchCompetitors()
    }
  }, [id, activeTab, toast])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const loadMoreMessages = async () => {
    if (!hasMoreMessages) return
    

    try {
      const nextPage = page + 1
      const response = await axios.get(`/api/getProductChats/${id}?page=${nextPage}&limit=5`)
      const data = await response.data;

      // Prepend older messages
      setMessages((prevMessages) => [...data.messages.docs, ...prevMessages])
      setHasMoreMessages(data.messages.hasMore)
      setPage(nextPage)
    } catch (error) {
      console.error("Error loading more messages:", error)
      toast({
        title: "Error",
        description: "Failed to load more messages. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop } = messagesContainerRef.current

      // Load more messages when scrolled to top
      if (scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
        loadMoreMessages()
      }
    }
  }

  const handleSendQuery = async () => {
    if (!query.trim()) return

    const userMessage = {
      _id: Date.now().toString(),
      content: query,
      role: "user",
      createdAt: new Date().toISOString(),
    }

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage as IMessage])
    setQuery("")
    setIsLoadingResponse(true)

    try {
      // Call API to get AI response
      const response = await axios.post("/api/getProductQuery", {query:userMessage.content,productId:id},{
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.data

      // Add AI response to chat
      const aiMessage = {
        _id: Date.now().toString() + "-ai",
        content: data.ai_response,
        role: "assistant",
        createdAt: new Date().toISOString(),
        sources: data.sources,
      }

      setMessages((prev) => [...prev, aiMessage as IMessage])
    } catch (error) {
      console.error("Error getting AI response:", error)
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingResponse(false)
    }
  }

  const handleCompetitorClick = (competitor: ICompeditor) => {
    setSelectedCompetitor(competitor)
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl py-5">
      <Tabs defaultValue="query" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="competitors">Competitor Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-1 border">
          <div
            ref={messagesContainerRef}
            className="flex flex-col space-y-4 h-[70vh] overflow-y-auto p-4 border rounded-lg"
            onScroll={handleScroll}
          >
            {isLoadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <h3 className="text-lg font-medium">No messages yet</h3>
                <p className="text-muted-foreground">Start by asking a question about your product</p>
              </div>
            ) : (
              <>
                {hasMoreMessages && (
                  <Button variant="ghost" size="sm" onClick={loadMoreMessages} className="mx-auto">
                    Load more messages
                  </Button>
                )}

                {messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {/* Markdown rendering */}
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_ul>li]:pl-5 [&_ul>li>p]:-indent-5 [&_ul>li>p]:pl-5">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-primary-foreground/20 text-wrap">
                          <p className="text-xs font-medium mb-1">Sources:</p>
                          <div className="text-xs space-y-1 text-wrap flex flex-col flex-wrap">
                            {message.sources.map((source, index) => (
                              <li key={index}>
                                <a href={source} target="_blank" rel="noopener noreferrer" className="underline">
                                  {source}
                                </a>
                               </li>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Input
              placeholder="Ask AI anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendQuery()
                }
              }}
              disabled={isLoadingResponse}
              className="flex-1"
            />
            <Button onClick={handleSendQuery} disabled={!query.trim() || isLoadingResponse}>
              {isLoadingResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          {isLoadingCompetitors ? (
            <div className="flex justify-center items-center h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <h3 className="text-lg font-medium">No competitor data available</h3>
              <p className="text-muted-foreground">We couldn't find any competitors for this product</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {competitors.map((competitor,index) => (
                <Card
                  key={index}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleCompetitorClick(competitor)}
                >
                  <CardHeader>
                    <CardTitle>{competitor.name}</CardTitle>
                    <CardDescription>Competitor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3">{competitor.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

{selectedCompetitor && (
  <Dialog open={!!selectedCompetitor} onOpenChange={() => setSelectedCompetitor(null)}>
    {/* The DialogContent has a fixed size and is scrollable when content overflows */}
    <DialogContent className="max-w-3xl h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{selectedCompetitor.name}</DialogTitle>
        <DialogDescription>Competitor Analysis</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Description</h3>
          <p className="text-muted-foreground">{selectedCompetitor.description}</p>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2 text-green-600 dark:text-green-400">Strengths</h3>
            <ul className="list-disc pl-5 space-y-1">
              {selectedCompetitor.good_points?.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2 text-red-600 dark:text-red-400">Weaknesses</h3>
            <ul className="list-disc pl-5 space-y-1">
              {selectedCompetitor.bad_points?.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
)}

        </TabsContent>
      </Tabs>
    </div>
  )
}


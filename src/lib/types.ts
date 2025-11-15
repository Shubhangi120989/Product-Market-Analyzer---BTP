export interface Product {
  productid: string
  product_name: string
  product_description: string
  status: "pending" | "ready"
}

export interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: string
  sources?: string[]
}

export interface CompetitorProduct {
  name: string
  desc: string
  good_points: string[]
  bad_points: string[]
}


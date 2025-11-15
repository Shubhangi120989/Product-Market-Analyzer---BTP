import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart2, MessageSquare, Search, Zap } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-background pt-20 pb-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Product Market Analyzer
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                Gain powerful insights into your product's market position with our AI-powered analysis tool.
              </p>
            </div>
            <div className="space-x-4">
              <Link href="/login">
                <Button className="px-8">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" className="px-8">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Powerful Features</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Our platform provides comprehensive tools to analyze your product's market position and competitive
                landscape.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-full">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">AI-Powered Insights</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Get intelligent answers to your product questions using our advanced AI system.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-full">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Competitor Analysis</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Compare your product against competitors to identify strengths and weaknesses.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-full">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Market Research</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Discover market trends and consumer preferences to guide your product strategy.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
              <div className="p-2 bg-primary/10 rounded-full">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Real-time Updates</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Stay informed with the latest market changes and competitor movements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-24 bg-primary/5">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Ready to Analyze Your Product?
              </h2>
              <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                Join thousands of product managers who are making data-driven decisions.
              </p>
            </div>
            <Link href="/login">
              <Button size="lg" className="px-8">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 md:py-8">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 Product Market Analyzer. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
              Terms
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-gray-500 hover:underline dark:text-gray-400">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

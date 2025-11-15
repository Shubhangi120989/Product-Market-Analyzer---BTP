"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { useSession } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Don't show navbar on login page
  if (pathname === "/login") {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold text-xl">Market Analyzer</span>
        </Link>
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          {session && (
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Dashboard
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
            {session ? (
            <div className="flex items-center space-x-2">
              <Avatar>
                {/* console.log("image :",session.user.image) */}
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
              <span className="font-bold text-sm pl-3">{session.user.name}</span>
              <span className="text-sm text-muted-foreground pl-3">{session.user.email}</span>
              </div>
            </div>
            ) : (
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { IProduct } from "@/models/product.model"
import axios from "axios"

const formSchema = z.object({
  product_name: z.string().min(1, { message: "Product name is required" }),
  product_category: z.string().min(1, { message: "Product category is required" }),
  product_description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<IProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      product_description: "",
      product_category: "",
    },
  })

  useEffect(() => {
    // Fetch user products
    const fetchProducts = async () => {
      try {
        const response = await axios.get("/api/getUserProducts")
        const data = response.data
        console.log("products: ",data)
        setProducts(data.products.docs)
      } catch (error) {
        console.error("Error fetching products:", error)
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [toast])

  const handleProductClick = (product: IProduct) => {
    if (product.status === "pending") {
      toast({
        title: "Product Processing",
        description: "Product is still processing / information processing",
      })
      return
    }

    router.push(`/product/${product._id}`)
  }

  const onSubmit = async (data: FormValues) => {
    setIsCreating(true)

    try {
      // Call API to create new product
      // Close dialog and reset form
      setIsDialogOpen(false)
      // const dummyProduct: any = {
      //   _id: `dummy-${Date.now()}`,
      //   product_name: data.product_name,
      //   product_description: data.product_description,
      //   status: "pending",
      // }

      // setProducts([dummyProduct, ...products])

      setTimeout(async () => {
        try {
          const response = await axios.post("/api/createNewProduct", data, {
        headers: {
          "Content-Type": "application/json",
        },
          })

          const newProduct = response.data.product

          // Remove dummy product and add new product to the list
            // setProducts((prevProducts) => prevProducts.slice(1))
          setProducts((prevProducts) => [newProduct, ...prevProducts])

          toast({
        title: "Success",
        description: "Product created successfully",
          })
        } catch (error) {
          console.error("Error creating product:", error)
          toast({
        title: "Error",
        description: `Failed to create product. Please try again. ${(error as any).message}`,
        variant: "destructive",
          })
        } finally {
          setIsCreating(false)
        }
      }, 0)

      form.reset()

      toast({
        title: "Success",
        description: "Product created successfully",
      })
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: `Failed to create product. Please try again. ${(error as any).message}`,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Products</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create New Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
              <DialogDescription>Add a new product to analyze its market position.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
              control={form.control}
              name="product_name"
              render={({ field }) => (
              <FormItem>
                <FormLabel>
                Product Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="product_category"
              render={({ field }) => (
              <FormItem>
                <FormLabel>
                Product Category <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                <Input placeholder="Enter product category" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
              />
              <FormField
              control={form.control}
              name="product_description"
              render={({ field }) => (
              <FormItem>
                <FormLabel>Product Description</FormLabel>
                <FormControl>
                <Textarea placeholder="Enter product description" className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
              )}
              />

                <DialogFooter>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Product"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </CardContent>
              <CardFooter>
                <div className="h-4 bg-muted rounded w-1/4"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground mb-6">Create your first product to get started</p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Create New Product
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card
              key={product._id}
              className={`cursor-pointer transition-all hover:shadow-md ${
              product.status === "pending" ? "border-amber-500 border-2" : ""
              }`}
              onClick={() => handleProductClick(product)}
            >
              <CardHeader className="pb-2">
              <CardTitle className="flex flex-col">
                <span className="flex items-center">
                {product.product_name}
                {product.status === "pending" ? (
                  <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full">
                  Processing
                  </span>
                ) : (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                  Ready
                  </span>
                )}
                </span>
                <span className="text-sm text-muted-foreground">{product.product_category}</span>
              </CardTitle>
              </CardHeader>
              <CardContent>
              <p className="text-muted-foreground line-clamp-2">{product.product_description}</p>
              </CardContent>
              <CardFooter>
              <p className="text-sm text-muted-foreground">
                Status: {product.status === "pending" ? "Processing" : "Ready"}
              </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


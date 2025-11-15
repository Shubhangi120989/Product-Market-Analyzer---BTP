export interface BrandInfo {
    brand: string
    rating: number
    reviews: number
    price: string
    snippet: string
  };
  

export const getTopBrands = async (product_category: string): Promise<BrandInfo[]> => {
    try{
        const country="India"
        const response = await fetch(
            `https://serpapi.com/search.json?engine=google_shopping&q=best ${product_category} brands in ${country}&api_key=${process.env.SERPAPI_KEY}`
          );
      
          const data = await response.json();
          // console.log("Full API Response:", data); // Logs full response for debugging
      
          if (!data.shopping_results) {
            throw new Error("No shopping results found");
          }
      
          // Process results: remove sponsored, extract necessary data
          const brands: BrandInfo[] = data.shopping_results
            .filter((item: any) => item.position !== undefined) // Remove sponsored ads
            .map((item: any) => ({
              // brand: item.title.split(" ")[0], // Extract first word as brand (heuristic)
              brand: item.title, // Use full title as brand
              rating: item.rating || 0, // Use 0 if no rating is available
              reviews: item.reviews || 0, // Use 0 if no reviews are available
              price: item.price || 0, // Use 0 if no price is available
              marketing_highlight: item.snippet || "No snippet available", // Provide snippet or default text
            }));
      
          // Sort by rating (desc), then by number of reviews (desc)
          brands.sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviews - a.reviews;
          });

          return brands.slice(0,10); // Return top 5 brands

    }catch(error){
        console.error("Error fetching top brands:", error);
        return [];

    }
};
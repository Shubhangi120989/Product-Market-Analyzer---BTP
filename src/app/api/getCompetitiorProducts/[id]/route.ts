import { NextRequest, NextResponse } from "next/server"
// import type { CompetitorProduct } from "@/lib/types"
import { getUser } from "@/lib/authHelper";
import { Compeditor, ICompeditor } from "@/models/competitor.model";
import {  Product } from "@/models/product.model";
import { BrandInfo } from "@/lib/getTopBrands";
import { getTopBrands } from "@/lib/getTopBrands";
import { processBrandData } from "@/lib/processBrandData";
// Sample competitor data for demonstration
// const competitorData: Record<string, CompetitorProduct[]> = {
//   "1": [
//     {
//       name: "Amazon Echo",
//       desc: "Smart speaker with Alexa voice assistant, offering smart home control, music playback, and information services.",
//       good_points: [
//         "Extensive third-party integrations",
//         "Strong ecosystem of compatible devices",
//         "Regular feature updates",
//         "Competitive pricing",
//       ],
//       bad_points: [
//         "Privacy concerns with cloud processing",
//         "Occasional misinterpretation of commands",
//         "Requires stable internet connection",
//         "Limited customization options",
//       ],
//     },
//     {
//       name: "Google Nest",
//       desc: "Smart speaker with Google Assistant, providing voice-controlled smart home management, information retrieval, and media playback.",
//       good_points: [
//         "Superior knowledge graph for questions",
//         "Seamless integration with Google services",
//         "Natural conversation capabilities",
//         "Multi-user voice recognition",
//       ],
//       bad_points: [
//         "Fewer third-party smart home integrations than Alexa",
//         "Privacy concerns with data collection",
//         "Occasional connectivity issues",
//         "Limited offline functionality",
//       ],
//     },
//     {
//       name: "Apple HomePod",
//       desc: "Premium smart speaker with Siri, focused on high-quality audio and Apple ecosystem integration.",
//       good_points: [
//         "Superior sound quality",
//         "Strong privacy focus",
//         "Seamless Apple ecosystem integration",
//         "Elegant design",
//       ],
//       bad_points: [
//         "Higher price point",
//         "Limited third-party integrations",
//         "Siri lags behind other assistants in capabilities",
//         "Requires Apple devices for full functionality",
//       ],
//     },
//   ],
//   "2": [
//     {
//       name: "Fitbit Charge",
//       desc: "Popular fitness tracker with heart rate monitoring, sleep tracking, and exercise recognition.",
//       good_points: [
//         "Established brand reputation",
//         "Robust companion app",
//         "Large user community",
//         "Good battery life (5 days)",
//       ],
//       bad_points: [
//         "More expensive than your product",
//         "Requires subscription for advanced features",
//         "Occasional syncing issues",
//         "Limited smartwatch capabilities",
//       ],
//     },
//     {
//       name: "Apple Watch",
//       desc: "Premium smartwatch with comprehensive health and fitness tracking features.",
//       good_points: [
//         "Comprehensive health features",
//         "Seamless iPhone integration",
//         "High-quality display",
//         "Extensive app ecosystem",
//       ],
//       bad_points: [
//         "Much higher price point",
//         "Poor battery life (1 day)",
//         "Requires iPhone",
//         "Overkill for users who just want fitness tracking",
//       ],
//     },
//     {
//       name: "Samsung Galaxy Fit",
//       desc: "Affordable fitness band with basic health tracking and smartphone notifications.",
//       good_points: ["Competitive pricing", "Good battery life", "Water resistance", "Lightweight design"],
//       bad_points: [
//         "Limited feature set",
//         "Basic companion app",
//         "Less accurate sensors than your product",
//         "Limited third-party app support",
//       ],
//     },
//   ],
//   "3": [
//     {
//       name: "Apple AirPods Pro",
//       desc: "Premium wireless earbuds with active noise cancellation and seamless Apple device integration.",
//       good_points: [
//         "Excellent noise cancellation",
//         "Seamless Apple ecosystem integration",
//         "Comfortable fit",
//         "Good sound quality",
//       ],
//       bad_points: [
//         "Higher price point",
//         "Average battery life",
//         "Limited functionality with non-Apple devices",
//         "Non-customizable sound profile",
//       ],
//     },
//     {
//       name: "Sony WF-1000XM4",
//       desc: "High-end wireless earbuds with industry-leading noise cancellation and sound quality.",
//       good_points: [
//         "Superior sound quality",
//         "Best-in-class noise cancellation",
//         "Excellent battery life",
//         "Highly customizable via app",
//       ],
//       bad_points: [
//         "Bulkier design than your product",
//         "Higher price point",
//         "Occasional Bluetooth connectivity issues",
//         "Less intuitive controls",
//       ],
//     },
//     {
//       name: "Samsung Galaxy Buds Pro",
//       desc: "Feature-rich wireless earbuds with active noise cancellation and good sound quality.",
//       good_points: [
//         "Competitive pricing",
//         "Good sound quality",
//         "Seamless Samsung device integration",
//         "Compact design",
//       ],
//       bad_points: [
//         "Noise cancellation not as effective as your product",
//         "Average battery life",
//         "Limited iOS functionality",
//         "Occasional fit issues for some users",
//       ],
//     },
//   ],
// }

export async function POST(req:NextRequest) {
  try{
        const user = await getUser();
        // console.log("user:", user);
        if (!user) {
                return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        const productId = req.nextUrl.pathname.split("/").pop();
        console.log("productId:", productId);
        if(!productId){
              return NextResponse.json({ message: "productId is required" }, { status: 400 });
        }
      const product = await Product.findById(productId);
      if(!product || product.status==="pending"){
                return NextResponse.json({ message: "Product not ready" }, { status: 400 });
      }

      const compeditors: ICompeditor[] = await Compeditor.find({ product: productId });
      if(compeditors.length!=0){
        return NextResponse.json({compeditors:compeditors}, {status:200});
      }
      const product_category = product.product_category; // Assign a valid value
      // const country = "India";
      const topBrands: BrandInfo[] = await getTopBrands(product_category);
      console.log("topBrands: ",topBrands);
      if(topBrands.length==0){
        return NextResponse.json({ message: "Failed to fetch top brands" }, { status: 500 });
      }
      let competitorCount=0;
      let brandIterator=0;
      while(competitorCount<4 && brandIterator<topBrands.length){
        if(topBrands[brandIterator]?.brand.startsWith(product.product_name)){
          brandIterator++;
          continue;
        }else{
          competitorCount++;
        }
        const competitor:ICompeditor = await processBrandData(topBrands[brandIterator]!, product_category);
        if(competitor){
          compeditors.push(competitor);
        }
        brandIterator++;
        //create new compeditor object also
        try {
          await Compeditor.create({
            product: productId,
            name: competitor.name,
            description: competitor.description,
            good_points: competitor.good_points || [],
            bad_points: competitor.bad_points || [],
          });
        } catch (error) {
          console.error("Error creating competitor object in database:", error);
        }

        
      }

      return NextResponse.json({compeditors:compeditors}, {status:200});
      
  }catch(e){
    console.error("Error fetching messages:", e);
    return NextResponse.json({ message: "Failed to fetch messages" }, { status: 500 });

  }
}




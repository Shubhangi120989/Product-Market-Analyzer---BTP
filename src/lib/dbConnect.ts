import mongoose from "mongoose";

//next js is edge time framework, so while connecting to the database we have to make sure ki pehle se hi koi connection estabilished h toh ussi connection ko use krne
//ni connected h toh connect krenge

type ConnectionObject={
    isConnected?: number;
}

const connection:ConnectionObject={};

//void in ts means that we dont care about the type of the return value
async function dbConnect():Promise<void>{
    if(connection.isConnected){
        console.log("Using existing db connection");
        return;

    }
    try{
        const connectionString = `${process.env.MONGODB_URI}/${process.env.DB_NAME}`;
        console.log("Connecting to MongoDB with connection string:", connectionString.replace(/\/\/.*:.*@/, "//***:***@")); // Hide credentials in logs
        
        const db = await mongoose.connect(connectionString, {
            serverSelectionTimeoutMS: 5000, // 5 seconds timeout
            socketTimeoutMS: 45000, // 45 seconds socket timeout
        });
        
        // Disable buffering to prevent timeout issues
        mongoose.set('bufferCommands', false);
        
        connection.isConnected = db.connections[0]?.readyState;
        console.log("New db connection created successfully");

    }catch(error){
        console.log("Error while connecting to the database", error);
        throw new Error(`Database connection failed: ${error}`);
    }

}

export default dbConnect;
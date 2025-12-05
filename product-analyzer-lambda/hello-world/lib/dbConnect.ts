import mongoose from "mongoose";

//Lambda functions should establish database connections properly
type ConnectionObject = {
    isConnected?: number;
}

const connection: ConnectionObject = {};

// Connect to database function for Lambda
export async function connectToDatabase(): Promise<void> {
    if (connection.isConnected) {
        console.log("Using existing db connection");
        return;
    }
    
    try {
        const db = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}` || "");
        connection.isConnected = db.connections[0]?.readyState;
        console.log("New db connection created");
    } catch (error) {
        console.log("Error while connecting to the database", error);
        throw error; // In Lambda, we throw instead of process.exit
    }
}

export default connectToDatabase;
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
        const db=await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}` || " ");
        connection.isConnected=db.connections[0]?.readyState;
        console.log("New db connection created");

    }catch(error){
        console.log("Error while connecting to the database",error);
        process.exit(1);


    }

}

export default dbConnect;
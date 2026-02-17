require('dotenv').config({
  path: '../../.env'
});

const { lambdaHandler } = require('./app');

const testEvent = {
    product_name: "Samsung Galaxy S24 Ultra",
    product_category: "smartphone",
    product_description: "Flagship android phone with AI features"
};

async function runTest() {
    console.log("🚀 Starting Local Test...");
    try {
        const result = await lambdaHandler(testEvent);
        console.log("✅ Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Test Failed:", error);
    }
}

runTest();

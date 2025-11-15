// Helper function to compute cosine similarity between two numeric vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if(vecA.length !== vecB.length) throw new Error("Vector lengths must match");
    const dotProduct = vecA.reduce((sum, a, idx) => sum + (vecB[idx] !== undefined ? a * vecB[idx] : 0), 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}

export default cosineSimilarity;
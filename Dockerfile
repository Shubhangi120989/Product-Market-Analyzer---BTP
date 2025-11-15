# Base image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./

# Install dependencies
RUN npm install

# Expose port 3000
EXPOSE 3000

# Default command for development
CMD ["npm", "run", "dev"]

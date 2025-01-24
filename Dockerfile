# Use the official Node.js image with Alpine
FROM node:20-alpine3.18

# Set the working directory
WORKDIR /app

# Copy only package files first for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --force

# Copy the rest of the application
COPY . .

# Expose port 3000 for the app
EXPOSE 3000

# Command to run the app
CMD ["npm", "run", "dev"]

# Use the official Node.js 16 image as the base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN yarn run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
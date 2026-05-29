# Use the official Node.js 16 image as the base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so they
# must exist BEFORE `npm run build`. They arrive as a --build-arg from CI and
# are promoted to an ENV so Next.js can read them during the build below.
ARG NEXT_PUBLIC_ALCHEMY_KEY
ENV NEXT_PUBLIC_ALCHEMY_KEY=$NEXT_PUBLIC_ALCHEMY_KEY

# Build the Next.js app
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
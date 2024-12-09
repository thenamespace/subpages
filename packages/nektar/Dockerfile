# Stage 1: Build the React Vite app
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy the rest of the app's source code
COPY . .

# Install dependencies
RUN yarn install

# Build the app for production
RUN yarn build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the built files from the first stage
COPY --from=build /app/dist /usr/share/nginx/html

RUN ls -la

# Copy custom Nginx configuration (optional)
COPY ./.nginx/nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 3000 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
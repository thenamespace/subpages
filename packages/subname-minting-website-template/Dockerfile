FROM node:18 AS build

WORKDIR /app

COPY . .

RUN yarn install

RUN yarn build

FROM nginx:alpine

COPY ./.nginx/nginx.conf /etc/nginx/nginx.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
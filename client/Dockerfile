FROM node:22-alpine

WORKDIR /app

COPY ./package.json ./

RUN npm install

COPY . . 
RUN npm run billd

FROM nginx
EXPOSE 3000
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
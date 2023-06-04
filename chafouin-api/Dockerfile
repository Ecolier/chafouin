FROM node:20-alpine

RUN apk add --update \
    curl \
    tor \
    && rm -rf /var/cache/apk/*

EXPOSE 9229
EXPOSE 8080
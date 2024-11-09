FROM node:lts-alpine

WORKDIR /alert-svc

COPY . .

RUN npm ci --production && \
    rm -rf $(npm get cache)

ENTRYPOINT ["npm", "start"]
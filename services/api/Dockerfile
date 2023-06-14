FROM node:19-alpine AS build

WORKDIR /build

RUN apk add --update \
    curl \
    tor \
    && rm -rf /var/cache/apk/*

# Yarn
COPY package.json .
COPY yarn.lock .
COPY .yarnrc.yml .
COPY .yarn ./.yarn

# Compilation context
COPY tsconfig.json .

# Common
COPY packages/common/src ./packages/common/src
COPY packages/common/package.json ./packages/common/package.json
COPY packages/common/tsconfig.json ./packages/common/tsconfig.json

# Provider
COPY packages/provider/src ./packages/provider/src
COPY packages/provider/package.json ./packages/provider/package.json
COPY packages/provider/tsconfig.json ./packages/provider/tsconfig.json

# Railways 
COPY packages/uzrailways/src ./packages/uzrailways/src
COPY packages/uzrailways/package.json ./packages/uzrailways/package.json
COPY packages/uzrailways/tsconfig.json ./packages/uzrailways/tsconfig.json

COPY services/api/package.json ./services/api/

RUN yarn plugin import workspace-tools
RUN yarn workspaces focus @chafouin/api

COPY services/api services/api

RUN yarn workspace @chafouin/api build

FROM node:20-alpine as run

WORKDIR /usr/app

COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/services/api/package.json .
COPY --from=build /build/services/api/dist ./dist

COPY --from=build /build/packages/common/package.json ./packages/common/package.json
COPY --from=build /build/packages/common/lib ./packages/common/lib

COPY --from=build /build/packages/provider/package.json ./packages/provider/package.json
COPY --from=build /build/packages/provider/lib ./packages/provider/lib

COPY --from=build /build/packages/uzrailways/package.json ./packages/uzrailways/package.json
COPY --from=build /build/packages/uzrailways/lib ./packages/uzrailways/lib

ENTRYPOINT ["yarn", "node", "./dist/index.js"]

EXPOSE 8080
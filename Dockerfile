FROM node:20-alpine

WORKDIR /app

# pin yarn 4 na imagem (independe do host / do campo packageManager)
RUN corepack enable && corepack prepare yarn@4.12.0 --activate

# deps primeiro (cache)
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# prisma client
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
RUN yarn prisma generate

# codigo
COPY src ./src

EXPOSE 3000

# default = API; worker service sobrescreve command no stack.yml
CMD ["yarn", "tsx", "src/server.ts"]

FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

ENTRYPOINT ["sh", "-c", "echo '=== DATABASE_URL is:' && echo $DATABASE_URL && echo '=== Running prisma db push ===' && npx prisma db push --force-reset && echo '=== Starting server ===' && exec node dist/index.js"]

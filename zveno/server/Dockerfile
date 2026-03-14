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

CMD ["sh", "-c", "echo 'DATABASE_URL: $DATABASE_URL' && npx prisma db push --force-reset && node dist/index.js"]

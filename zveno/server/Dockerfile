FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npx prisma db push
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]

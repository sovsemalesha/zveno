FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npx prisma db push --skip-seed
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]

FROM node:20

WORKDIR /app

COPY zveno/server/package*.json ./
RUN npm ci

COPY zveno/server/tsconfig.json ./
COPY zveno/server/src ./src
COPY zveno/server/prisma ./prisma

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]

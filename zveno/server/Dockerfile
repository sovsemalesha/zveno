FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'npx prisma db push --force-reset' >> /entrypoint.sh && \
    echo 'exec node dist/index.js' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/entrypoint.sh"]

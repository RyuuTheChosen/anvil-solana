FROM node:20 AS builder
# Install Solana CLI (Anza distribution)
RUN sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"
RUN solana-keygen --version
WORKDIR /app
COPY vanity/package*.json ./
COPY vanity/prisma ./prisma/
RUN npm install
RUN npx prisma generate
COPY vanity/ .
RUN npm run build

FROM node:20
RUN sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"
WORKDIR /app
COPY vanity/package*.json ./
COPY vanity/prisma ./prisma/
RUN npm install --production
RUN npx prisma generate
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]

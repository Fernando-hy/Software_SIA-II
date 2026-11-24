FROM node:22-bookworm-slim
WORKDIR /opt/nexo-inventario
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]

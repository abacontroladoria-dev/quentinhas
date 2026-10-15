# Servidor da API (Coolify). Sem dependências: só Node (node:sqlite) e os arquivos de src/ e server/.
FROM node:24-alpine

WORKDIR /app
COPY src ./src
COPY server ./server

# Banco e backups ficam em /data: monte um volume persistente nesse caminho.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node

ENV NODE_ENV=production \
    PORT=3000 \
    DADOS=/data/quentinhas.db \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/saude || exit 1

CMD ["node", "server/servidor.js"]

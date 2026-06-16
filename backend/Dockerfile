FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads/documentos uploads/evidencias uploads/auditorias uploads/acciones logs

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

FROM node:18-bullseye-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
RUN apt-get update && apt-get install -y --no-install-recommends \
      libatk1.0-0 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
      libxrandr2 libgbm1 libasound2 libpango-1.0-0 libxss1 libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*
COPY . .
CMD ["npm","run","build"]

FROM node:20

RUN apt-get update && apt-get install -y curl

RUN curl -sSL https://get.wasp.sh/installer.sh | sh -s -- -v 0.15.0 && \
    ln -s /root/.local/bin/wasp /usr/local/bin/wasp

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PATH="/root/.local/bin:${PATH}"

RUN wasp build

EXPOSE 3001

CMD ["wasp", "start"]
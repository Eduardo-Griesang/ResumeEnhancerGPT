FROM node:20

# Install curl and other dependencies
RUN apt-get update && apt-get install -y curl

# Install Wasp CLI and symlink to /usr/local/bin
RUN curl -sSL https://get.wasp.sh/installer.sh | sh -s -- -v 0.15.0 && \
    ln -s /root/.local/bin/wasp /usr/local/bin/wasp

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# (Optional, but safe)
ENV PATH="/root/.local/bin:${PATH}"

RUN wasp build

EXPOSE 3001

CMD ["wasp", "start"]
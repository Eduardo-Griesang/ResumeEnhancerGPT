FROM node:20

# Install curl and other dependencies
RUN apt-get update && apt-get install -y curl

# Install Wasp CLI
RUN curl -sSL https://get.wasp-lang.dev/installer.sh | sh && \
    echo 'export PATH="$HOME/.wasp/bin:$PATH"' >> /root/.bashrc

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the app
COPY . .

# Make sure Wasp is in PATH for all RUN/CMD
ENV PATH="/root/.wasp/bin:${PATH}"

# Build the app
RUN wasp build

# Expose the port Wasp uses
EXPOSE 3001

# Start the app
CMD ["wasp", "start"]
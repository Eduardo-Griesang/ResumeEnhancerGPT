#!/bin/sh
curl -sSL https://get.wasp.sh/installer.sh | sh
export PATH="$HOME/.wasp/bin:$PATH"
export PATH="$PATH:/root/.local/bin"
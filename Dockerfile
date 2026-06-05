FROM python:3.12-slim

# System deps. tmux is required by Cookbook for background downloads/serves.
# openssh-client is required for Cookbook remote server tests, setup, probes,
# downloads, and serves from Docker installs.
# git/cmake are required when Cookbook builds llama.cpp on first llama.cpp
# launch inside Docker.
# nodejs/npm provide npx for the optional built-in Browser MCP server.
# gosu lets the entrypoint drop privileges cleanly so signals still reach
# uvicorn directly (no extra shell layer like `su`/`sudo` would add).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    curl \
    git \
    nodejs \
    npm \
    tmux \
    openssh-client \
    gosu \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install whisper.cpp for local transcription via pywhispercpp (bundles the binary)
RUN pip install --no-cache-dir pywhispercpp==1.5.0
# Also ensure whisper-cli binary is symlinked or available
RUN python -c "import pywhispercpp; print(pywhispercpp.__file__)" || true

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Create data directory (mount a volume here for persistence)
RUN mkdir -p data logs services/cache/search

# Entrypoint that drops to PUID/PGID (default 1000:1000) and repairs
# ownership on the bind-mounted /app/data and /app/logs. Without this,
# the container runs as root and writes root-owned files into host
# bind mounts — any later non-root run (or a host user trying to
# update them) silently fails on EPERM, breaking skill extraction,
# prefs persistence, mail attachments, etc.
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 7000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7000"]

# Build whisper.cpp from source for transcription
RUN cd /tmp && \
    git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git && \
    cd whisper.cpp && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_EXAMPLES=ON -DWHISPER_BUILD_TESTS=OFF && \
    cmake --build build --config Release -j$(nproc) && \
    cp build/bin/whisper-cli /usr/local/bin/whisper-cli && \
    cp build/src/libwhisper.so* /usr/local/lib/ 2>/dev/null || true && \
    cp build/ggml/src/libggml.so* /usr/local/lib/ 2>/dev/null || true && \
    ldconfig 2>/dev/null || true && \
    cd / && rm -rf /tmp/whisper.cpp

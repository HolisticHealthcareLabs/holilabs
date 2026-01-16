# CDSS V3 - Sandboxed Document Parser
#
# SECURITY CONSTRAINTS (enforced at runtime):
# - --network none (NO network access)
# - --read-only (read-only root filesystem)
# - --tmpfs /tmp:size=50M (writable temp only)
# - --memory 512m (memory limit)
# - --cpus 1 (CPU limit)
# - --user 1000:1000 (non-root user)
# - Container is destroyed after each job
#
# Build:
#   docker build -t holilabs/document-parser:latest .
#
# Run (example):
#   docker run --rm \
#     --network none \
#     --read-only \
#     --tmpfs /tmp:size=50M \
#     --memory 512m \
#     --cpus 1 \
#     --user 1000:1000 \
#     -v /path/to/job:/job:rw \
#     holilabs/document-parser:latest \
#     python /app/parse.py /job/input.pdf /job/output.json

FROM python:3.11-slim

# Security: Create non-root user
RUN groupadd -g 1000 parser && \
    useradd -m -u 1000 -g parser parser

# Install system dependencies for PyMuPDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libmupdf-dev \
        libfreetype6 \
        libharfbuzz0b \
        libjpeg62-turbo \
        libpng16-16 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directory
WORKDIR /app

# Install Python dependencies as root first
# Note: Versions pinned for reproducibility and security
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy parsing script
COPY --chown=parser:parser parse.py /app/parse.py

# Make script executable
RUN chmod +x /app/parse.py

# Switch to non-root user
USER parser

# No CMD - container is invoked with explicit command
# This prevents accidental execution without proper arguments

#!/bin/bash
# Swap Memory Setup Script for Production Server
# Run this on the remote server if build crashes with OOM

set -e

SWAP_SIZE="4G"
SWAP_FILE="/swapfile"

echo "=== Swap Memory Configuration ==="
echo "This script will create a ${SWAP_SIZE} swap file"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: Please run as root"
    exit 1
fi

# Check if swap already exists
if [ -f "$SWAP_FILE" ]; then
    echo "Swap file already exists at $SWAP_FILE"
    swapon --show
    free -h
    exit 0
fi

echo "[1/5] Checking available disk space..."
AVAILABLE=$(df / | tail -1 | awk '{print $4}')
echo "Available space: ${AVAILABLE}KB"

echo "[2/5] Creating swap file..."
fallocate -l $SWAP_SIZE $SWAP_FILE
chmod 600 $SWAP_FILE

echo "[3/5] Setting up swap area..."
mkswap $SWAP_FILE

echo "[4/5] Enabling swap..."
swapon $SWAP_FILE

echo "[5/5] Making swap persistent..."
if ! grep -q "$SWAP_FILE" /etc/fstab; then
    echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
fi

# Optimize swappiness for build workloads
echo "vm.swappiness=10" >> /etc/sysctl.conf
sysctl -p

echo ""
echo "✓ Swap configuration complete"
swapon --show
free -h

#!/bin/bash
# Sync circuits from SolsticeProtocol to solstice-website frontend

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Syncing circuits from SolsticeProtocol...${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Define paths
SOURCE_CIRCUITS="../SolsticeProtocol/circuits/build"
TARGET_CIRCUITS="$SCRIPT_DIR/frontend/public/circuits"

# Check if source exists
if [ ! -d "$SOURCE_CIRCUITS" ]; then
    echo -e "${RED}Error: Source circuits directory not found at $SOURCE_CIRCUITS${NC}"
    echo -e "${RED}Make sure SolsticeProtocol is in the parent directory and circuits are built${NC}"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_CIRCUITS"

# Remove old circuits
echo -e "${BLUE}Removing old circuits...${NC}"
rm -rf "$TARGET_CIRCUITS"/*

# Copy new circuits
echo -e "${BLUE}Copying new circuits...${NC}"
cp -r "$SOURCE_CIRCUITS"/* "$TARGET_CIRCUITS/"

# Verify copy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Circuits synced successfully!${NC}"
    echo -e "${GREEN}✓ Files copied to: $TARGET_CIRCUITS${NC}"
    
    # List what was copied
    echo -e "\n${BLUE}Synced files:${NC}"
    ls -lh "$TARGET_CIRCUITS" | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'
else
    echo -e "${RED}✗ Error syncing circuits${NC}"
    exit 1
fi

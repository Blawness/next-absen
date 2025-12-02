#!/bin/bash

# Install Playwright browsers
npx playwright install chromium

# Install system dependencies for the browsers (requires sudo)
# This is often needed on fresh Ubuntu servers
npx playwright install-deps chromium

echo "Browser dependencies installed successfully!"

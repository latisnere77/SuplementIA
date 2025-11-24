#!/bin/bash

# Cleanup unused Lambda functions
# Archives unused Lambdas and deletes empty directories

set -e

echo "🧹 Cleaning up unused Lambda functions"
echo "======================================="
echo ""

# Create archive directory
echo "📦 Creating archive directory..."
mkdir -p ../../_archived/lambdas-nov22

# Archive unused Lambdas
echo "📦 Archiving unused Lambdas..."

if [ -d "cache-service" ]; then
  echo "  - Archiving cache-service..."
  mv cache-service ../../_archived/lambdas-nov22/
fi

if [ -d "enrich-orchestrator" ]; then
  echo "  - Archiving enrich-orchestrator..."
  mv enrich-orchestrator ../../_archived/lambdas-nov22/
fi

# Delete empty directories
echo "🗑️  Deleting empty directories..."

if [ -d "enrich-proxy" ]; then
  echo "  - Deleting enrich-proxy..."
  rm -rf enrich-proxy
fi

if [ -d "query-expander" ]; then
  echo "  - Deleting query-expander..."
  rm -rf query-expander
fi

if [ -d "deployment" ]; then
  echo "  - Deleting deployment..."
  rm -rf deployment
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 Remaining Lambdas:"
ls -d */ 2>/dev/null | grep -v node_modules || echo "  (none)"
echo ""
echo "📦 Archived Lambdas:"
ls -d ../../_archived/lambdas-nov22/*/ 2>/dev/null || echo "  (none)"
echo ""

#!/bin/bash
# This script creates the Gemini CLI context file.

# Create the GEMINI.md file with instructions for the agent
cat <<'EOF' > ~/.gemini/GEMINI.md
# Agent Instructions

You have access to a tool named `aws-mcp`. Use this tool to interact with Amazon Web Services (AWS). For example, you can use it to list AWS resources or describe services.
EOF

echo "Gemini CLI context file created at ~/.gemini/GEMINI.md"

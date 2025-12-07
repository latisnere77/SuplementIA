#!/bin/bash
# This script creates the Gemini CLI configuration file with debug logging for the MCP proxy.

# Create the directory if it doesn't exist
mkdir -p ~/.gemini

# Create the settings.json file
cat <<'EOF' > ~/.gemini/settings.json
{
  "mcpServers": [
    {
      "name": "aws-mcp",
      "command": "uvx",
      "timeout": 100000,
      "transport": "stdio",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-east-1",
        "--log-level",
        "DEBUG"
      ]
    }
  ]
}
EOF

echo "Gemini CLI configuration file updated at ~/.gemini/settings.json with proxy debug logging."
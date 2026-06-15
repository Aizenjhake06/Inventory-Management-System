# AI Assistant Setup Guide

## Overview
The WIHI Asia Inventory System now includes an AI-powered assistant using the 21st SDK and Claude Sonnet 4.6. The assistant can help users with inventory queries, order tracking, and system statistics.

## Setup Steps

### 1. Get Your 21st SDK API Key
1. Go to [https://platform.21st.dev](https://platform.21st.dev)
2. Sign up or log in
3. Create a new project
4. Copy your API key

### 2. Deploy Your Agent
```bash
# Login to 21st platform
npx @21st-sdk/cli login

# Deploy the agent
npx @21st-sdk/cli deploy
```

### 3. Add API Key to Environment
Add your API key to `.env.local`:
```env
API_KEY_21ST=your_actual_api_key_here
```

### 4. Access the AI Assistant
The AI Assistant is accessible in three ways:
1. **Floating Chat Button** - Click the purple chat button in the bottom-right corner of any dashboard page for quick access
2. **Dedicated Page** - Navigate to `/dashboard/ai-assistant` for a full-page chat experience
3. **Sidebar Navigation** - Find "AI Assistant" in the System section of the sidebar

## Features

### Current Capabilities
1. **Check Inventory** - Ask about product stock levels
2. **Track Orders** - Get order status by ID or waybill
3. **System Statistics** - View dashboard metrics

### Example Questions
- "What's the current inventory level for Product X?"
- "Track order #ORD-123456"
- "Show me today's revenue"
- "How many low stock items do we have?"
- "What's the return rate this week?"

## Customization

### Adding New Tools
Edit `src/agent.ts` to add new capabilities:

```typescript
newTool: tool({
  description: "Description of what this tool does",
  inputSchema: z.object({ 
    param: z.string().describe("Parameter description"),
  }),
  execute: async ({ param }) => {
    // Your logic here
    return {
      content: [{ 
        type: "text", 
        text: `Result: ${param}` 
      }],
    }
  },
}),
```

### Integrating with APIs
Update the tool execute functions to call your actual API endpoints:

```typescript
execute: async ({ productName }) => {
  const response = await fetch('/api/items?search=' + productName)
  const data = await response.json()
  
  return {
    content: [{ 
      type: "text", 
      text: `Found ${data.length} items matching "${productName}"` 
    }],
  }
},
```

## Architecture

```
src/agent.ts              → Agent configuration and tools
app/api/ai-token/route.ts → Token authentication endpoint
app/dashboard/ai-assistant/page.tsx → Chat UI
```

## Security Notes

- ⚠️ **Never commit your API key to Git**
- ✅ API keys are stored in `.env.local` (gitignored)
- ✅ Token exchange happens server-side for security
- ✅ Credentials are never exposed to the browser

## Troubleshooting

### Agent not responding
1. Check if API_KEY_21ST is set in `.env.local`
2. Verify agent was deployed: `npx @21st-sdk/cli deploy`
3. Check browser console for errors

### Tools not working
1. Ensure API endpoints are accessible
2. Check tool execute functions for errors
3. Verify input schema validation

## Next Steps

1. **Integrate Real APIs** - Connect tools to actual inventory/order endpoints
2. **Add More Tools** - Expand capabilities (analytics, reports, etc.)
3. **Improve Prompts** - Refine systemPrompt for better responses
4. **Add Auth** - Restrict access based on user roles

## Support

- 21st SDK Docs: https://docs.21st.dev
- AI SDK Docs: https://sdk.vercel.ai/docs
- Project Issues: [GitHub Issues](your-repo-url)

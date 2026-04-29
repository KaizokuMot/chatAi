# Nanochat AI Personality & Tools System

This system provides a centralized, reusable way to manage your AI's personality, capabilities, and tools. Everything is modular and easily updatable.

## 📁 Configuration Files

### 1. **aiPersonality.ts** - AI Personality & System Prompts
Defines the app's personality and system prompts used in all conversations.

**Files:**
- `src/config/aiPersonality.ts`

**Usage:**
```typescript
import { APP_PERSONALITY, SYSTEM_PROMPTS } from '../config/aiPersonality';

// Use in your API calls:
const systemPrompt = SYSTEM_PROMPTS.GENERAL; // or SYSTEM_PROMPTS.THERAPY
```

**Customization:**
Edit the `APP_PERSONALITY` constant to change your AI's personality globally. Edit `SYSTEM_PROMPTS` to add more specialized personalities for different contexts.

---

### 2. **aiTools.ts** - Available Tools & Capabilities
Defines all tools the AI can access (internet search, document analysis, image analysis, etc.)

**Files:**
- `src/config/aiTools.ts`

**Defined Tools:**
- Current Date & Time
- Calendar Awareness
- Internet Search
- Web Browsing
- Document Analysis
- Image Recognition & Analysis
- Text Analysis
- Data Synthesis
- Research Compilation

**How to Add a New Tool:**
```typescript
// In aiTools.ts, add to AI_TOOLS object:
export const AI_TOOLS: Record<string, AITool> = {
  // ... existing tools ...
  
  my_new_tool: {
    name: 'My New Tool',
    description: 'What this tool does',
    enabled: true,
    category: 'analysis', // 'information' | 'analysis' | 'research' | 'utility'
    version: '1.0',
    lastUpdated: '2026-04-29',
  },
};
```

---

### 3. **toolsManager.ts** - Tool Management Utilities
Helper functions to manage tools programmatically.

**Files:**
- `src/config/toolsManager.ts`

**Common Operations:**

```typescript
import {
  updateToolStatus,
  updateToolDescription,
  addNewTool,
  getAllEnabledTools,
  logToolsStatus
} from '../config/toolsManager';

// Enable/disable a tool
updateToolStatus('internet_search', false); // Disable internet search
updateToolStatus('internet_search', true);  // Re-enable it

// Update tool description
updateToolDescription('internet_search', 'New description here');

// Add a new tool
addNewTool('my_tool', {
  name: 'My Tool',
  description: 'My tool description',
  enabled: true,
  category: 'analysis',
  version: '1.0',
  lastUpdated: new Date().toISOString().split('T')[0],
});

// Get all enabled tools
const enabledTools = getAllEnabledTools();

// Log all tools with their status
logToolsStatus();
```

---

## 🎨 Customizing Personality

### Edit the General Personality
**File:** `src/config/aiPersonality.ts`

```typescript
export const APP_PERSONALITY = `You are Nanochat, ...
// Edit this string to change how your AI behaves
`;
```

### Add a New System Prompt
```typescript
export const SYSTEM_PROMPTS = {
  GENERAL: APP_PERSONALITY,
  THERAPY: `...`, // Therapy mode
  CREATIVE: `You are a creative writing assistant...`, // Add this
};
```

Then use it in your component:
```typescript
const systemPrompt = SYSTEM_PROMPTS.CREATIVE;
```

---

## 🔧 Using Tools in Your Components

### In Chat Component
```typescript
import { SYSTEM_PROMPTS } from '../config/aiPersonality';
import { generateToolsDescription } from '../config/aiTools';

// When making API calls:
const systemPrompt = SYSTEM_PROMPTS.GENERAL + '\n' + generateToolsDescription();

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: modelName,
    messages: [
      { role: "system", content: systemPrompt },
      ...currentHistory,
      { role: "user", content: userMsg }
    ],
    stream: false
  })
});
```

---

## 📊 Tools Enabled by Default

All tools are enabled by default:
- ✅ Current Date & Time
- ✅ Calendar Awareness  
- ✅ Internet Search
- ✅ Web Browsing
- ✅ Document Analysis
- ✅ Image Recognition & Analysis
- ✅ Text Analysis
- ✅ Data Synthesis
- ✅ Research Compilation

### Disable a Tool
```typescript
import { updateToolStatus } from '../config/toolsManager';

updateToolStatus('internet_search', false); // Disable it
```

---

## 🚀 Development Workflow

### 1. **Changing Personality**
- Edit `src/config/aiPersonality.ts`
- Update `APP_PERSONALITY` or add to `SYSTEM_PROMPTS`

### 2. **Adding a New Tool**
- Add to `AI_TOOLS` in `src/config/aiTools.ts`
- Use `toolsManager.addNewTool()` if adding programmatically

### 3. **Managing Tools in Code**
- Use functions from `toolsManager.ts`
- Check browser console with `logToolsStatus()`

### 4. **Testing**
- Tools are automatically included in system prompts
- AI will reference them in responses
- Check component logs to verify tools are loaded

---

## 📝 Examples

### Example 1: Change Personality for Specific User Type
```typescript
// In your component
const userType = localStorage.getItem('userType');
const systemPrompt = userType === 'professional' 
  ? SYSTEM_PROMPTS.PROFESSIONAL 
  : SYSTEM_PROMPTS.GENERAL;
```

### Example 2: Dynamically Disable Tools for Guest Users
```typescript
// In App.tsx on load
if (isGuestUser) {
  updateToolStatus('internet_search', false);
  updateToolStatus('document_analysis', false);
}
```

### Example 3: Add a New Tool at Runtime
```typescript
addNewTool('custom_tool', {
  name: 'My Custom Tool',
  description: 'Analyzes business metrics',
  enabled: true,
  category: 'analysis',
  version: '1.0',
  lastUpdated: new Date().toISOString().split('T')[0],
});
```

---

## 🔍 Debugging

### Log All Tools Status
```typescript
import { logToolsStatus } from '../config/toolsManager';

logToolsStatus(); // Check browser console
```

### Export Configuration for Backup
```typescript
import { exportToolsConfig } from '../config/toolsManager';

const backup = exportToolsConfig();
console.log(backup);
```

---

## 📚 System Prompts Currently Available

| Prompt | Use Case |
|--------|----------|
| `SYSTEM_PROMPTS.GENERAL` | Main chat interface - intelligent, warm, helpful |
| `SYSTEM_PROMPTS.THERAPY` | Therapy page - empathetic, supportive therapist |

## ✨ Quick Updates

### Update Tool Version (triggers lastUpdated date)
```typescript
updateToolVersion('internet_search', '1.1');
```

### Change Tool Description
```typescript
updateToolDescription('image_analysis', 'Now supports live video analysis!');
```

---

## 🎯 Next Steps

1. Test the personality system by having a conversation
2. Customize personality strings to match your brand
3. Enable/disable tools based on your needs
4. Add custom tools for your specific use cases
5. Monitor console logs to verify tools are being recognized

---

## 🐛 Troubleshooting

**Tools not showing in AI responses?**
- Check if tools are enabled: `logToolsStatus()`
- Verify system prompt is being sent to API
- Check browser console for errors

**Personality not changing?**
- Clear browser cache and reload
- Verify imports are correct
- Check that system prompt is being passed to fetch call

**Want to add more tools?**
- Add to `AI_TOOLS` in `aiTools.ts`
- Use consistent naming (snake_case)
- Include clear descriptions
- Set proper category

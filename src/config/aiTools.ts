/**
 * AI Tools Configuration
 * Define all available tools/capabilities the AI can use
 * These can be easily updated and extended
 */

export interface AITool {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  showInSidebar: boolean;
  category: 'information' | 'analysis' | 'research' | 'utility';
  version: string;
  lastUpdated: string;
}

export const AI_TOOLS: Record<string, AITool> = {
  // INTERNAL TOOLS (Automatic)
  current_date_time: {
    name: 'Current Date & Time',
    description: 'INTERNAL: AI has automatic access to current time/date context.',
    enabled: true,
    showInSidebar: false,
    category: 'information',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  calendar_aware: {
    name: 'Calendar Awareness',
    description: 'INTERNAL: AI has automatic access to calendar/holiday context.',
    enabled: true,
    showInSidebar: false,
    category: 'information',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  // RESEARCH TOOLS (Automatic)
  internet_search: {
    name: 'Internet Search',
    description: 'INTERNAL: AI can automatically search the web for current information.',
    enabled: true,
    showInSidebar: true,
    category: 'research',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  web_browse: {
    name: 'Web Browsing',
    description: 'Browse and summarize web pages, extract key information, and provide context from URLs.',
    enabled: true,
    showInSidebar: true,
    category: 'research',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  // ANALYSIS TOOLS
  document_analysis: {
    name: 'Document Analysis',
    description: 'Analyze PDFs, text files, and documents. Extract key points, summarize content, and answer questions about documents.',
    enabled: true,
    showInSidebar: true,
    category: 'analysis',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  image_analysis: {
    name: 'Image Recognition & Analysis',
    description: 'Analyze images to identify objects, text (OCR), scenes, and provide insights. Can read charts and diagrams.',
    enabled: true,
    showInSidebar: false,
    category: 'analysis',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  text_analysis: {
    name: 'Text Analysis',
    description: 'Analyze text for sentiment, key topics, entities, and patterns. Useful for understanding content and research.',
    enabled: true,
    showInSidebar: false,
    category: 'analysis',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  // UTILITY TOOLS
  data_synthesis: {
    name: 'Data Synthesis',
    description: 'Combine information from multiple sources into coherent summaries and insights.',
    enabled: true,
    showInSidebar: false,
    category: 'utility',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  research_compilation: {
    name: 'Research Compilation',
    description: 'Compile research from multiple sources with proper citations and structured insights.',
    enabled: true,
    showInSidebar: false,
    category: 'utility',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },
};

/**
 * Get all enabled tools
 */
export const getEnabledTools = (): AITool[] => {
  return Object.entries(AI_TOOLS)
    .filter(([_, tool]) => tool.enabled)
    .map(([id, tool]) => ({ ...tool, id } as AITool));
};

/**
 * Get tools by category
 */
export const getToolsByCategory = (category: AITool['category']): AITool[] => {
  return Object.entries(AI_TOOLS)
    .filter(([_, tool]) => tool.enabled && tool.category === category)
    .map(([id, tool]) => ({ ...tool, id } as AITool));
};

/**
 * Generate a formatted tools description for the AI model
 */
export const generateToolsDescription = (): string => {
  const toolsByCategory = {
    information: getToolsByCategory('information'),
    research: getToolsByCategory('research'),
    analysis: getToolsByCategory('analysis'),
    utility: getToolsByCategory('utility'),
  };

  return `
## AVAILABLE TOOLS:

### Information Tools:
${toolsByCategory.information.map(t => `- ${t.name}: ${t.description}`).join('\n')}

### Research Tools:
${toolsByCategory.research.map(t => `- ${t.name}: ${t.description}`).join('\n')}

### Analysis Tools:
${toolsByCategory.analysis.map(t => `- ${t.name}: ${t.description}`).join('\n')}

### Utility Tools:
${toolsByCategory.utility.map(t => `- ${t.name}: ${t.description}`).join('\n')}

## GUIDELINES:
- You have AUTOMATIC access to all Information and Research tools.
- Use these tools proactively to provide the most accurate and up-to-date answers.
- You do NOT need user permission to use Search, Time, or Calendar tools.
- When you use a tool, briefly mention it (e.g., "Searching for the latest news on...") to keep the user informed.
- Always cite sources when using internet search.
- Provide transparency about limitations.
`;
};

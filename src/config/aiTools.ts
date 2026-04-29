/**
 * AI Tools Configuration
 * Define all available tools/capabilities the AI can use
 * These can be easily updated and extended
 */

export interface AITool {
  name: string;
  description: string;
  enabled: boolean;
  category: 'information' | 'analysis' | 'research' | 'utility';
  version: string;
  lastUpdated: string;
}

export const AI_TOOLS: Record<string, AITool> = {
  // INFORMATION TOOLS
  current_date_time: {
    name: 'Current Date & Time',
    description: 'Get the current date, time, day of week, and timezone. Useful for scheduling, reminders, and understanding context.',
    enabled: true,
    category: 'information',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  calendar_aware: {
    name: 'Calendar Awareness',
    description: 'Understand holidays, seasons, and important dates in context. Help with scheduling and time-based planning.',
    enabled: true,
    category: 'information',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  // RESEARCH TOOLS
  internet_search: {
    name: 'Internet Search',
    description: 'Search the web for current information, news, and recent developments. Always cite sources.',
    enabled: true,
    category: 'research',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  web_browse: {
    name: 'Web Browsing',
    description: 'Browse and summarize web pages, extract key information, and provide context from URLs.',
    enabled: true,
    category: 'research',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  // ANALYSIS TOOLS
  document_analysis: {
    name: 'Document Analysis',
    description: 'Analyze PDFs, text files, and documents. Extract key points, summarize content, and answer questions about documents.',
    enabled: true,
    category: 'analysis',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  image_analysis: {
    name: 'Image Recognition & Analysis',
    description: 'Analyze images to identify objects, text (OCR), scenes, and provide insights. Can read charts and diagrams.',
    enabled: true,
    category: 'analysis',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  text_analysis: {
    name: 'Text Analysis',
    description: 'Analyze text for sentiment, key topics, entities, and patterns. Useful for understanding content and research.',
    enabled: true,
    category: 'analysis',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  // UTILITY TOOLS
  data_synthesis: {
    name: 'Data Synthesis',
    description: 'Combine information from multiple sources into coherent summaries and insights.',
    enabled: true,
    category: 'utility',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },

  research_compilation: {
    name: 'Research Compilation',
    description: 'Compile research from multiple sources with proper citations and structured insights.',
    enabled: true,
    category: 'utility',
    version: '1.0',
    lastUpdated: '2026-04-29',
  },
};

/**
 * Get all enabled tools
 */
export const getEnabledTools = (): AITool[] => {
  return Object.values(AI_TOOLS).filter(tool => tool.enabled);
};

/**
 * Get tools by category
 */
export const getToolsByCategory = (category: AITool['category']): AITool[] => {
  return Object.values(AI_TOOLS).filter(
    tool => tool.enabled && tool.category === category
  );
};

/**
 * Generate a formatted tools description for the AI model
 */
export const generateToolsDescription = (): string => {
  const enabledTools = getEnabledTools();
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
- Use tools proactively when relevant to help users better
- Always cite sources when using internet search
- Explain which tools you're using and why
- Provide transparency about limitations
`;
};

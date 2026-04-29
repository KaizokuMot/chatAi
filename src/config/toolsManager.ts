/**
 * Tools Management Utility
 * Provides helper functions to manage, enable/disable, and update AI tools
 * 
 * USAGE:
 * - Enable a tool: updateToolStatus('internet_search', true)
 * - Get all enabled tools: getAllEnabledTools()
 * - Add a new tool: addNewTool(toolConfig)
 * - Update tool description: updateToolDescription('internet_search', 'New description')
 */

import { AI_TOOLS, type AITool } from './aiTools';

/**
 * Toggle a tool's enabled status
 */
export const updateToolStatus = (toolName: string, enabled: boolean): void => {
  if (AI_TOOLS[toolName]) {
    AI_TOOLS[toolName].enabled = enabled;
    console.log(`Tool "${toolName}" is now ${enabled ? 'enabled' : 'disabled'}`);
  } else {
    console.warn(`Tool "${toolName}" not found`);
  }
};

/**
 * Update a tool's version and lastUpdated date
 */
export const updateToolVersion = (toolName: string, version: string): void => {
  if (AI_TOOLS[toolName]) {
    AI_TOOLS[toolName].version = version;
    AI_TOOLS[toolName].lastUpdated = new Date().toISOString().split('T')[0];
    console.log(`Tool "${toolName}" updated to version ${version}`);
  }
};

/**
 * Update a tool's description
 */
export const updateToolDescription = (toolName: string, newDescription: string): void => {
  if (AI_TOOLS[toolName]) {
    AI_TOOLS[toolName].description = newDescription;
    console.log(`Tool "${toolName}" description updated`);
  }
};

/**
 * Add a new tool to the system
 */
export const addNewTool = (toolName: string, toolConfig: AITool): void => {
  if (AI_TOOLS[toolName]) {
    console.warn(`Tool "${toolName}" already exists. Use updateTool instead.`);
    return;
  }
  AI_TOOLS[toolName] = toolConfig;
  console.log(`New tool "${toolName}" added successfully`);
};

/**
 * Remove a tool from the system (use disable instead for safety)
 */
export const removeTool = (toolName: string): boolean => {
  if (AI_TOOLS[toolName]) {
    delete AI_TOOLS[toolName];
    console.log(`Tool "${toolName}" removed`);
    return true;
  }
  console.warn(`Tool "${toolName}" not found`);
  return false;
};

/**
 * Get tool info
 */
export const getToolInfo = (toolName: string): AITool | null => {
  return AI_TOOLS[toolName] || null;
};

/**
 * Get all tools
 */
export const getAllTools = (): AITool[] => {
  return Object.values(AI_TOOLS);
};

/**
 * Get only enabled tools
 */
export const getAllEnabledTools = (): AITool[] => {
  return Object.values(AI_TOOLS).filter(tool => tool.enabled);
};

/**
 * Export tools configuration (useful for backup/debugging)
 */
export const exportToolsConfig = (): string => {
  return JSON.stringify(AI_TOOLS, null, 2);
};

/**
 * Log all tools status
 */
export const logToolsStatus = (): void => {
  console.group('AI Tools Status');
  Object.values(AI_TOOLS).forEach((tool) => {
    const status = tool.enabled ? '[ENABLED]' : '[DISABLED]';
    console.log(`${status} - ${tool.name} (v${tool.version})`);
  });
  console.groupEnd();
};

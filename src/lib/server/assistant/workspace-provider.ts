import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { assistantConfiguration } from './operations';
import type { WorkspaceModel } from './workspace-core';

export function workspaceProvider(enabled = true): WorkspaceModel | undefined {
  const config = enabled ? assistantConfiguration(process.env) : null;
  if (!config) return undefined;
  const model = config.provider === 'openai'
    ? createOpenAI({ apiKey: config.apiKey }).responses(config.model)
    : createAnthropic({ apiKey: config.apiKey }).messages(config.model);
  return { model, provider: config.provider };
}

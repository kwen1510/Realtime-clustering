export const CLUSTER_MODEL_ID = 'qwen/qwen3-32b';
export const CLUSTER_MODEL_LABEL = 'Qwen3-32B (Groq)';
export const PROMPT_LINES = [
  'You are clustering short student answers.',
  'Return JSON only with {"clusters": [{ "title": string, "indices": number[] }]}.',
  'Use 2–5 concise clusters, non-overlapping indices, no prose outside JSON.',
  'Responses array is zero-indexed; indices must be a JSON array of integers.'
];
export const PROMPT_TEMPLATE = PROMPT_LINES.join('\n');
export const MIN_CLUSTER_RESPONSES = 5;

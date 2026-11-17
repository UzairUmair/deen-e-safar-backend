import Groq from 'groq-sdk';
export function createGroqProvider(env, transport = {}) {
  const configured = Boolean(env.GROQ_API_KEY && env.GROQ_MODEL);
  const client = configured ? new Groq({ apiKey: env.GROQ_API_KEY, timeout: 15000, maxRetries: 0, ...transport }) : null;
  return {
    configured,
    async complete(messages, signal, options = {}) {
      if (!client) throw Object.assign(new Error('Provider unavailable'), { code: 'NOT_CONFIGURED' });
      const schema = options.schema || { type: 'object', additionalProperties: false, required: ['answer', 'sourceIds', 'limitations'], properties: { answer: { type: 'string' }, sourceIds: { type: 'array', items: { type: 'string' } }, limitations: { type: 'string' } } };
      const response = await client.chat.completions.create({
        model: env.GROQ_MODEL, messages, temperature: .2, max_completion_tokens: 1200,
        response_format: env.GROQ_RESPONSE_FORMAT === 'json_schema'
          ? { type: 'json_schema', json_schema: { name: options.name || 'grounded_answer', strict: true, schema } }
          : { type: 'json_object' },
      }, { signal });
      options.onUsage?.({inputTokens:response.usage?.prompt_tokens || 0,outputTokens:response.usage?.completion_tokens || 0});
      return response.choices?.[0]?.message?.content || '';
    },
  };
}

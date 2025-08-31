import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiChatClient } from '../aiChatClient';
import { supabase } from '@/lib/supabase';

vi.mock('@/services/futureSelfService', () => ({
  futureSelfService: {
    getActiveProfile: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test' }),
  },
}));

describe('aiChatClient - API calls', () => {
  const originalEnv = { ...import.meta.env } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock session with access token
    (supabase.auth.getSession as any) = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'token-123', user: { id: 'u1' } } },
      error: null,
    });

    // Default to Edge route
    (import.meta as any).env = { ...originalEnv, VITE_USE_LOCAL_AI: undefined };
  });

  afterEach(() => {
    (global as any).fetch && vi.restoreAllMocks();
  });

  it('calls /api/chat with bearer token and payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ response: 'Hello from Edge' }),
    } as any);
    (global as any).fetch = mockFetch;

    const res = await aiChatClient.sendMessage('hi');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect((init.headers as any)['Authorization']).toBe('Bearer token-123');
    const body = JSON.parse(init.body as string);
    expect(body).toHaveProperty('message', 'hi');
    expect(body).toHaveProperty('conversationHistory');
    expect(Array.isArray(body.conversationHistory)).toBe(true);
    expect(res.response).toBe('Hello from Edge');
  });

  it('uses local server when VITE_USE_LOCAL_AI=1', async () => {
    (import.meta as any).env = { ...originalEnv, VITE_USE_LOCAL_AI: '1' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ response: 'Hello from Local' }),
    } as any);
    (global as any).fetch = mockFetch;

    const res = await aiChatClient.sendMessage('hello');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3002/api/chat');
    expect(res.response).toBe('Hello from Local');
  });
});


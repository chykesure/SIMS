'use client';

import { useAppStore } from '@/store/index';

// Override global fetch to include tenant and user headers (client-side only)
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const state = useAppStore.getState();
    const tenantId = state.user?.tenantId || '';
    const userId = state.user?.id || '';

    if (tenantId) {
      const headers = new Headers(init?.headers);
      headers.set('x-tenant-id', tenantId);
      if (userId) {
        headers.set('x-user-id', userId);
      }
      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };
}
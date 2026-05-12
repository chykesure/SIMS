'use client';

import { useAppStore } from '@/store/index';

// Override global fetch to include tenant header (client-side only)
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const tenantId = useAppStore.getState().user?.tenantId || '';

    if (tenantId) {
      const headers = new Headers(init?.headers);
      headers.set('x-tenant-id', tenantId);
      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };
}

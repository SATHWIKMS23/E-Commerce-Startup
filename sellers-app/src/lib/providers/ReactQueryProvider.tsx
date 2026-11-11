'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            retry: 1, // Let's keep retry to 1 for faster errors in development
            placeholderData: keepPreviousData,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

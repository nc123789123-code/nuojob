"use client";

import { useCallback, useEffect, useState } from "react";

export interface Access {
  loading: boolean;
  email: string | null;
  pro: boolean;
  refresh: () => Promise<void>;
}

/** Client hook: reads the current access level (email / pro) from the cookie. */
export function useAccess(): Access {
  const [state, setState] = useState<{ loading: boolean; email: string | null; pro: boolean }>({
    loading: true,
    email: null,
    pro: false,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/account");
      const d = await res.json();
      setState({ loading: false, email: d.email ?? null, pro: !!d.pro });
    } catch {
      setState({ loading: false, email: null, pro: false });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

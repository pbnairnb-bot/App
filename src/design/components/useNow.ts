import React from 'react';

/** Re-renders every 30 s so countdowns tick and expired deals drop out. */
export function useNow(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

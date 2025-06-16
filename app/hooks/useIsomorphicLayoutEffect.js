/**
 * useIsomorphicLayoutEffect hook for better SSR compatibility
 * Uses useLayoutEffect on the client and useEffect on the server
 * This prevents hydration warnings while maintaining proper timing
 */

import { useEffect, useLayoutEffect } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect;

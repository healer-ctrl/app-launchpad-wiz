import { useState, useEffect, useCallback } from "react";

const MOCK_DATA_KEY = "finpulse_use_mock_data";
const EVENT_NAME = "finpulse_settings_changed";

function readValue(): boolean {
  const stored = localStorage.getItem(MOCK_DATA_KEY);
  return stored === null ? true : stored === "true";
}

export function useSettings() {
  const [useMockData, setUseMockData] = useState<boolean>(readValue);

  useEffect(() => {
    const sync = () => setUseMockData(readValue());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleMockData = useCallback((value: boolean) => {
    localStorage.setItem(MOCK_DATA_KEY, String(value));
    setUseMockData(value);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return { useMockData, toggleMockData };
}

/** Read-only helper for hooks that just need the current value */
export function getUseMockData(): boolean {
  return readValue();
}

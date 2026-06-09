import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useUrlParam(key: string, defaultValue = '') {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (nextValue: string | null) => {
      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);
          const normalizedValue = nextValue ?? '';

          if (!normalizedValue || normalizedValue === defaultValue) {
            nextParams.delete(key);
          } else {
            nextParams.set(key, normalizedValue);
          }

          return nextParams;
        },
        { replace: true }
      );
    },
    [defaultValue, key, setSearchParams]
  );

  return [value, setValue] as const;
}

export function useUrlBooleanParam(key: string, defaultValue = false) {
  const [rawValue, setRawValue] = useUrlParam(key, defaultValue ? '1' : '');
  const value = rawValue === '1';

  const setValue = useCallback(
    (nextValue: boolean) => {
      setRawValue(nextValue ? '1' : '');
    },
    [setRawValue]
  );

  return [value, setValue] as const;
}
import React from 'react';
import { useSearchParams } from 'react-router-dom';

// Convert string to a base64
export const toBase64Url = (s: string) => {
  return window
    .btoa(s)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '.');
};

// Convert base64 to a string
export function fromBase64Url(s: string) {
  return window.atob(
    s.replace(/-/g, '+').replace(/_/g, '/').replace(/\./g, '=')
  );
}

// Hook to manage state in the URL query string using base64 encoding
export const useBase64SearchParams = <T>(
  key: string,
  initParams: T
): [T, (params: T) => void, string | null] => {
  const initParamsStr = toBase64Url(JSON.stringify(initParams, null, ''));
  const [searchParams, setSearchParams] = useSearchParams({
    [key]: initParamsStr,
  });
  const params = JSON.parse(fromBase64Url(searchParams.get(key) || '') || '{}');
  const setParams = (params: T) => {
    const base64Str = toBase64Url(JSON.stringify(params, null, ''));
    setSearchParams(
      (params) => {
        params.set(key, base64Str);
        return params;
      },
      {
        replace: true,
      }
    );
  };
  return [params, setParams, searchParams.get(key)];
};
// Hook to manage state in a React component using base64 encoding
export const useBase64StateParams = <T>(
  initParams: T
): [T, (params: T) => void, string | null] => {
  const [stateParams, setStateParams] = React.useState(initParams);
  const base64Str = toBase64Url(JSON.stringify(stateParams, null, ''));
  return [stateParams, setStateParams, base64Str];
};

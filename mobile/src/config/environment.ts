const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const apiUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5001/api',
);

export const environment = {
  apiUrl,
  socketUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_SOCKET_URL ?? apiUrl.replace(/\/api$/, ''),
  ),
} as const;

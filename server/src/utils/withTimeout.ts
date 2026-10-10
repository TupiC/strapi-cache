export const withTimeout = (callback: () => Promise<any>, ms: number) => {
  let timeout: NodeJS.Timeout | null = null;

  return Promise.race([
    callback().then((result) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      return result;
    }),
    new Promise((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error("timeout"));
      }, ms);
    }),
  ]);
};

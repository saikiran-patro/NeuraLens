const placeholderCredential = /^(your(?:_|-)|replace(?:_|-)|change(?:_|-)|example|placeholder)/i;

export function hasConfiguredCredential(value: string | undefined) {
  const credential = value?.trim();
  return Boolean(credential && !placeholderCredential.test(credential));
}

export const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const stddev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

export const covariance = (a: number[], b: number[]): number => {
  if (a.length !== b.length || a.length < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - ma) * (b[i] - mb);
  return sum / (a.length - 1);
};

export const correlation = (a: number[], b: number[]): number => {
  const sa = stddev(a);
  const sb = stddev(b);
  if (sa === 0 || sb === 0) return 0;
  return covariance(a, b) / (sa * sb);
};

export const trailingMean = (values: number[], window: number): number => {
  const slice = values.slice(-window);
  if (slice.length === 0) return 0;
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
};

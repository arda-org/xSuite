// Pretiffy type: https://twitter.com/mattpocockuk/status/1622730173446557697
// eslint-disable-next-line @typescript-eslint/ban-types
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type PreserveDefinedness<U, V> = {
  [K in keyof U & keyof V]: undefined extends U[K]
    ? V[K]
    : Exclude<V[K], undefined>;
};

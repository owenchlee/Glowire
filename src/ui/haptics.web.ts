// Web has no haptics (expo-haptics is a no-op there), so skip loading it.
const none = () => {};

export const buzz = { tap: none, win: none, oops: none, thud: none };

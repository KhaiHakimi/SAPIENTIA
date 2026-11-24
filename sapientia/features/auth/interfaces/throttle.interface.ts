export interface ThrottleKeys {
  /** One counter per account tried: emailThrottleKey for staff, the pupils' own key for pupils. */
  account: string;
  address: string;
}

/** An attempt already counted by reserveAttempt, kept so a right password can give it back. */
export interface ThrottleReservation {
  account: string;
  /** The address counter's key and the window the attempt was counted in. */
  address: { key: string; windowStartedAt: Date };
}

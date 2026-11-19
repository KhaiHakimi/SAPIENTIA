import { describe, expect, it } from 'vitest';
import { generateRecoveryCode, hashRecoveryCode } from './recovery-code.service';

describe('recovery codes', () => {
  it('are ten characters without look-alikes, shown in two groups', () => {
    for (let index = 0; index < 50; index += 1) expect(generateRecoveryCode()).toMatch(/^[a-hj-km-np-z2-9]{5}-[a-hj-km-np-z2-9]{5}$/);
    expect(generateRecoveryCode(() => 0)).toBe('aaaaa-aaaaa');
  });

  it('hash the same however they are typed', () => {
    expect(hashRecoveryCode('ABCDE-FGHJK')).toEqual(hashRecoveryCode(' abcde fghjk '));
    expect(hashRecoveryCode('abcde-fghjk')).not.toEqual(hashRecoveryCode('abcde-fghjm'));
  });
});

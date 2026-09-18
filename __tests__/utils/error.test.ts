import {describeError} from '@/utils/error';

/**
 * `describeError` is only ever called from inside a rejection handler, which
 * constrains it in two ways that are easy to lose and hard to notice, because
 * losing either one produces a request the host never gets an answer to.
 */
describe('describeError', () => {
  it('uses the message of an Error', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('renders a thrown string as itself', () => {
    expect(describeError('plain string')).toBe('plain string');
  });

  it('renders other thrown values through String()', () => {
    expect(describeError(42)).toBe('42');
    expect(describeError(null)).toBe('null');
    expect(describeError(undefined)).toBe('undefined');
    expect(describeError({})).toBe('[object Object]');
  });

  // The hosts read an absent errorMessage as success, so a rejection reported
  // as `undefined` is delivered as an empty score list and written to the
  // database. Whatever was thrown has to come out as a string.
  it('never returns undefined, whatever it is given', () => {
    const thrown: unknown[] = [
      new Error(''),
      '',
      0,
      null,
      undefined,
      false,
      {},
      [],
      Symbol('sym'),
    ];
    for (const value of thrown) {
      const described = describeError(value);
      expect(typeof described).toBe('string');
      expect(described).not.toBeUndefined();
    }
  });

  // It runs inside rejection handlers, where a throw of its own would land in
  // the only handler for that rejection and leave the host waiting forever.
  // This is precisely why it does not go through `JSON.stringify`.
  it('does not throw on a circular reference, unlike JSON.stringify', () => {
    const circular: {self?: unknown} = {};
    circular.self = circular;

    expect(() => JSON.stringify(circular)).toThrow();
    expect(() => describeError(circular)).not.toThrow();
  });

  it('still reads the message off a circular Error', () => {
    const circular = new Error('boom') as Error & {self?: unknown};
    circular.self = circular;

    expect(() => JSON.stringify(circular)).toThrow();
    expect(describeError(circular)).toBe('boom');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce, delay, getNonce, isValidUrl } from '../../src/utils';

describe('isValidUrl', () => {
  it('returns true for a valid https URL', () => {
    expect(isValidUrl('https://jira.example.com')).toBe(true);
  });

  it('returns true for a valid http URL', () => {
    expect(isValidUrl('http://localhost:8080')).toBe(true);
  });

  it('returns true for a URL with a path and query string', () => {
    expect(isValidUrl('https://jira.example.com/browse/JRL-123?foo=bar')).toBe(
      true
    );
  });

  it('returns false for a plain hostname without a scheme', () => {
    expect(isValidUrl('jira.example.com')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });

  it('returns false for an arbitrary non-URL string', () => {
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('getNonce', () => {
  it('returns a string of exactly 32 characters', () => {
    expect(getNonce()).toHaveLength(32);
  });

  it('returns only alphanumeric characters', () => {
    expect(getNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it('returns a different value on each call', () => {
    // Technically could collide, but with 62^32 possibilities it is negligible
    expect(getNonce()).not.toBe(getNonce());
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the function after the specified delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer when called again before the delay elapses', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(50);
    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the function only once after a burst of calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls the function again after a new call following a completed debounce', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    debounced();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the specified number of milliseconds', async () => {
    const promise = delay(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it('does not resolve before the timeout elapses', () => {
    let resolved = false;
    delay(200).then(() => {
      resolved = true;
    });
    vi.advanceTimersByTime(199);
    expect(resolved).toBe(false);
  });
});

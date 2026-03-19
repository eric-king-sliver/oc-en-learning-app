import { describe, it, expect } from 'vitest';

describe('Sample Tests', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle strings', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('World');
    expect(greeting.length).toBe(13);
  });

  it('should handle arrays', () => {
    const items = [1, 2, 3];
    expect(items).toHaveLength(3);
    expect(items.includes(2)).toBe(true);
  });

  it('should handle objects', () => {
    const user = { id: '1', name: 'John' };
    expect(user.id).toBe('1');
    expect(user).toHaveProperty('name');
  });
});

import { describe, it, expect } from 'vitest';

function calculatePronunciationScore(expected: string, actual: string): number {
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0);

  const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
        }
      }
    }

    return dp[m][n];
  };

  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);

  if (expectedTokens.length === 0) return 0;
  if (actualTokens.length === 0) return 0;

  let matchedWords = 0;

  for (const expectedWord of expectedTokens) {
    for (const actualWord of actualTokens) {
      const distance = levenshteinDistance(expectedWord, actualWord);
      const threshold = Math.max(1, Math.floor(expectedWord.length * 0.3));

      if (distance <= threshold) {
        matchedWords++;
        break;
      }
    }
  }

  const wordScore = (matchedWords / expectedTokens.length) * 100;
  const lengthPenalty =
    Math.abs(expectedTokens.length - actualTokens.length) /
    Math.max(expectedTokens.length, actualTokens.length);

  return Math.round(Math.max(0, Math.min(100, wordScore * (1 - lengthPenalty * 0.3))));
}

describe('Speech Analysis', () => {
  describe('calculatePronunciationScore', () => {
    it('should return 100 for exact match', () => {
      const score = calculatePronunciationScore('hello world', 'hello world');
      expect(score).toBe(100);
    });

    it('should return lower score for completely different text', () => {
      const score = calculatePronunciationScore('hello world', 'zzz qqq');
      expect(score).toBe(0);
    });

    it('should return 0 for completely different text', () => {
      const score = calculatePronunciationScore('hello world', 'xyz abc def');
      expect(score).toBe(0);
    });

    it('should handle empty expected text', () => {
      const score = calculatePronunciationScore('', 'hello');
      expect(score).toBe(0);
    });

    it('should handle empty actual text', () => {
      const score = calculatePronunciationScore('hello', '');
      expect(score).toBe(0);
    });

    it('should be case insensitive', () => {
      const score = calculatePronunciationScore('HELLO WORLD', 'hello world');
      expect(score).toBe(100);
    });

    it('should ignore punctuation', () => {
      const score = calculatePronunciationScore('Hello, World!', 'Hello World');
      expect(score).toBe(100);
    });
  });
});

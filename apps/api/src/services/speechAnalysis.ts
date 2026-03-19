export interface SpeechAnalysisResult {
  transcript: string;
  score: number;
  feedback: string[];
  problemWords: string[];
}

function levenshteinDistance(str1: string, str2: string): number {
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
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

function findProblemWords(expected: string, actual: string): string[] {
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);
  const problemWords: string[] = [];

  for (const expectedWord of expectedTokens) {
    let found = false;
    for (const actualWord of actualTokens) {
      const distance = levenshteinDistance(expectedWord, actualWord);
      if (distance <= Math.max(1, Math.floor(expectedWord.length * 0.3))) {
        found = true;
        break;
      }
    }
    if (!found) {
      problemWords.push(expectedWord);
    }
  }

  return problemWords.slice(0, 3);
}

export function calculatePronunciationScore(expected: string, actual: string): number {
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
    Math.abs(expectedTokens.length - actualTokens.length) / Math.max(expectedTokens.length, actualTokens.length);

  const finalScore = Math.max(0, Math.min(100, wordScore * (1 - lengthPenalty * 0.3)));

  return Math.round(finalScore);
}

export function generateFeedback(expected: string, actual: string, score: number): string[] {
  const feedback: string[] = [];

  if (score >= 90) {
    feedback.push('Excellent pronunciation!');
  } else if (score >= 70) {
    feedback.push('Good job! Keep practicing.');
  } else if (score >= 50) {
    feedback.push('Not bad, but there is room for improvement.');
  } else {
    feedback.push('Try listening to the original and practice slowly.');
  }

  const problemWords = findProblemWords(expected, actual);
  if (problemWords.length > 0) {
    feedback.push(`Focus on: ${problemWords.join(', ')}`);
  }

  return feedback;
}

export function analyzeSpeech(expectedText: string, transcript: string): SpeechAnalysisResult {
  const score = calculatePronunciationScore(expectedText, transcript);
  const feedback = generateFeedback(expectedText, transcript, score);
  const problemWords = findProblemWords(expectedText, transcript);

  return {
    transcript,
    score,
    feedback,
    problemWords,
  };
}

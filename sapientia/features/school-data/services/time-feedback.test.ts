import { describe, expect, it } from 'vitest';
import { estimateBand, feedbackVerdict } from './time-feedback';

const answers = (under: number, middle: number, over: number) => ({ 'under_1h': under, '1_to_3h': middle, 'over_3h': over });

describe('estimateBand', () => {
  it('puts the edges where the question puts them', () => {
    expect(estimateBand(5)).toBe('under_1h');
    expect(estimateBand(59)).toBe('under_1h');
    expect(estimateBand(60)).toBe('1_to_3h');
    expect(estimateBand(180)).toBe('1_to_3h');
    expect(estimateBand(181)).toBe('over_3h');
    expect(estimateBand(6000)).toBe('over_3h');
  });
});

describe('feedbackVerdict', () => {
  it('says longer or shorter when more than half the answers fall in another band', () => {
    expect(feedbackVerdict(90, answers(0, 1, 4))).toBe('longer');
    expect(feedbackVerdict(30, answers(1, 3, 0))).toBe('longer');
    expect(feedbackVerdict(240, answers(1, 4, 1))).toBe('shorter');
    expect(feedbackVerdict(90, answers(3, 0, 0))).toBe('shorter');
  });

  it('says the estimate matches when most answers fall in its own band', () => {
    expect(feedbackVerdict(90, answers(1, 4, 1))).toBe('matches');
    expect(feedbackVerdict(45, answers(3, 0, 0))).toBe('matches');
  });

  it('reads no signal into answers without a majority', () => {
    expect(feedbackVerdict(90, answers(2, 2, 2))).toBe('mixed');
    // Exactly half is not "most".
    expect(feedbackVerdict(90, answers(0, 2, 2))).toBe('mixed');
    expect(feedbackVerdict(90, answers(0, 0, 0))).toBe('mixed');
  });
});

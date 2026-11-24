import { describe, expect, it, vi } from 'vitest';
import { monsterForLevel } from '@/features/characters';
import { pickText } from '@/shared/i18n/pick-text';
import { BATTLE_MESSAGES } from '../i18n/battle.messages';
import { BattleCancelled, type BattleContext, type BattleView } from '../interfaces/battle-view.interface';
import type { QuizStage } from '../interfaces/quiz.interface';
import { runBattle } from './battle-script.service';
import { chaptersFor, questionsFor } from './quiz-stage.service';

const stage: QuizStage = { chapter: chaptersFor('math')[0], level: 1 };
const pick = (value: Parameters<typeof pickText>[0]) => pickText(value, 'en');

/** Each question's text, as typed in the box, to its right answer, as shown in the menu. */
const rightAnswers = new Map(questionsFor(stage).map((question) => [pick(question.question), pick(question.options[question.answer])]));

/**
 * A screen where every animation ends at once and every answer is right; the pupil closes the dialog at the first Continue after
 * the monster falls.
 */
function viewClosingAfterTheWin(): BattleView {
  let lastLine = '';
  let foeFallen = false;
  const done = () => Promise.resolve();
  return {
    say: async (line) => {
      lastLine = line;
    },
    setTopic: () => undefined,
    waitForMore: () => (foeFallen ? Promise.reject(new BattleCancelled()) : done()),
    choose: async (labels) => labels.indexOf(rightAnswers.get(lastLine) ?? ''),
    wait: done,
    setHp: () => undefined,
    setRecord: () => undefined,
    resetArena: () => undefined,
    slideIn: done,
    heroAttacks: done,
    foeHurt: done,
    foeAttacks: done,
    heroHurt: done,
    foeFalls: async () => {
      foeFallen = true;
    },
    heroCheers: done,
    heroFalls: done,
    close: () => undefined,
  };
}

describe('the battle script', () => {
  it('pays the first-win reward as soon as the win is recorded, so closing the dialog cannot lose it', async () => {
    const recordResult = vi.fn((won: boolean) => ({ attempts: 1, wins: won ? 1 : 0 }));
    const claimFirstWin = vi.fn(() => true);
    const context: BattleContext = {
      stage,
      monster: monsterForLevel(stage.level),
      messages: () => BATTLE_MESSAGES.en,
      pick,
      heroName: () => 'Hang',
      recordResult,
      claimFirstWin,
      celebrate: () => undefined,
    };

    await runBattle(viewClosingAfterTheWin(), context);

    expect(recordResult).toHaveBeenCalledWith(true);
    expect(claimFirstWin).toHaveBeenCalledTimes(1);
  });
});

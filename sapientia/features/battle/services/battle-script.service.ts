import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import type { LocalizedText } from '@/shared/interfaces/localized-text.interface';
import { BATTLE_BONUS_COINS, BATTLE_BONUS_XP, FOE_DAMAGE, HERO_HP } from '../constants/battle.constants';
import { VILLAIN_LINES } from '../data/villain-lines';
import type { BattleRun } from '../interfaces/battle-run.interface';
import { BattleCancelled, type BattleContext, type BattleView } from '../interfaces/battle-view.interface';
import type { VillainLines } from '../interfaces/villain-lines.interface';
import { answerQuestion, nextQuestion, shuffleChoices, startRun } from './battle-run.service';
import { questionsFor, stageKey } from './quiz-stage.service';

/** The last question order per stage during this visit, so a retry never repeats it. */
const lastOrders = new Map<string, string>();

const oneOf = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** The monster's own line for this moment, quoted after its name; empty for a monster with no lines. */
function villainSays(context: BattleContext, line: (lines: VillainLines) => LocalizedText): string {
  const lines = VILLAIN_LINES[context.monster.id];
  return lines ? context.messages().speaks(context.pick(context.monster.name), context.pick(line(lines))) : '';
}

/** Text pieces joined with a space, skipping empty ones. */
const joined = (...parts: string[]) => parts.filter(Boolean).join(' ');

/**
 * The fight as a short script of awaited steps: type a line, wait, animate, move an HP bar. It talks to the screen only through
 * BattleView, and stops quietly when the view cancels (the dialog closed).
 */
export async function runBattle(view: BattleView, context: BattleContext): Promise<void> {
  try {
    await playFight(view, context);
  } catch (error) {
    if (!(error instanceof BattleCancelled)) throw error;
  }
}

function newRun(context: BattleContext, view: BattleView): BattleRun {
  const key = stageKey(context.stage);
  const { run, order } = startRun(questionsFor(context.stage), lastOrders.get(key));
  lastOrders.set(key, order);
  view.resetArena();
  view.setHp('foe', run.foeHp, run.foeMax, true);
  view.setHp('me', run.heroHp, HERO_HP, true);
  return run;
}

async function playFight(view: BattleView, context: BattleContext): Promise<void> {
  const text = context.messages;
  const foe = () => context.pick(context.monster.name);
  let run = newRun(context, view);

  await Promise.all([view.slideIn(), view.say(text().appeared(foe())).then(() => view.wait(700))]);
  const entrance = villainSays(context, (lines) => lines.entrance);
  if (entrance) {
    await view.say(entrance);
    await view.waitForMore();
  }
  await view.say(text().go(context.heroName()));
  await view.wait(600);

  for (;;) {
    let outcome: 'next' | 'win' | 'lose' = 'next';
    while (outcome === 'next') {
      const asked = nextQuestion(run);
      run = asked.run;
      const question = asked.question;
      const choices = shuffleChoices(question);
      const { chapter } = context.stage;
      view.setTopic(text().chapterTag(context.pick(SCHOOL_SUBJECTS[chapter.subject].name), chapter.number));
      await view.say(context.pick(question.question));
      const picked = await view.choose(choices.map((choice) => context.pick(choice.option)));
      view.setTopic('');

      const correct = choices[picked].correct;
      const answered = answerQuestion(run, question, correct, context.monster.hit);
      run = answered.run;
      outcome = answered.outcome;
      const why = context.pick(question.why);
      if (correct) {
        await view.say(text().rightMove(context.heroName()));
        await view.heroAttacks();
        view.setHp('foe', run.foeHp, run.foeMax);
        await view.foeHurt();
        await view.wait(500);
        await view.say(joined(villainSays(context, (lines) => oneOf(lines.pain)), text().foeHit(foe(), FOE_DAMAGE), why));
      } else {
        const right = context.pick(choices.find((choice) => choice.correct)?.option ?? '');
        await view.say(text().wrongMove(foe()));
        await view.foeAttacks();
        view.setHp('me', run.heroHp, HERO_HP);
        await view.heroHurt();
        await view.wait(500);
        await view.say(joined(
          villainSays(context, (lines) => oneOf(lines.taunts)),
          text().heroHurt(context.heroName(), context.monster.hit),
          `${text().answerWas} ${right}.`,
          why,
        ));
      }
      await view.waitForMore();
    }

    const choice = await finishRun(view, context, run, outcome === 'win');
    if (choice === 1) {
      view.close();
      return;
    }
    run = newRun(context, view);
    await view.say(text().go(context.heroName()));
    await view.wait(400);
  }
}

/** Returns the index picked in the closing menu: 0 to fight again, 1 to leave. */
async function finishRun(view: BattleView, context: BattleContext, run: BattleRun, won: boolean): Promise<number> {
  const text = context.messages;
  const foe = context.pick(context.monster.name);
  const hero = context.heroName();
  const record = context.recordResult(won);
  view.setRecord(record);

  if (won) {
    // Last words while it still stands, then it falls.
    const defeat = villainSays(context, (lines) => lines.defeat);
    if (defeat) {
      await view.say(defeat);
      await view.waitForMore();
    }
    await view.foeFalls();
    await view.heroCheers();
    await view.say(`${text().foeFainted(foe)} ${text().winStats(run.right, run.wrong)}`);
    await view.waitForMore();
    if (context.claimFirstWin()) {
      context.celebrate();
      await view.say(text().reward(hero, BATTLE_BONUS_XP, BATTLE_BONUS_COINS));
      await view.waitForMore();
    }
    // The first ever win at a level opens the next one in this chapter.
    if (record.wins === 1 && context.stage.level < 4) {
      await view.say(text().unlocked(text().levels[context.stage.level + 1]));
      await view.waitForMore();
    }
  } else {
    await view.heroFalls();
    await view.wait(700);
    const victory = villainSays(context, (lines) => lines.victory);
    if (victory) {
      await view.say(victory);
      await view.waitForMore();
    }
    await view.say(text().heroFainted(hero));
    await view.waitForMore();
  }

  if (run.wrong > 0) {
    const { chapter } = context.stage;
    await view.say(text().revisit(text().chapter(chapter.number, context.pick(chapter.title)), run.wrong));
    await view.waitForMore();
  }
  if (won) {
    await view.say('');
  } else {
    await view.say(text().retryHint);
    await view.wait(300);
  }
  return view.choose([won ? text().again : text().retry, text().leave]);
}

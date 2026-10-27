import { SCHOOL_SUBJECTS } from '@/shared/data/school-subjects';
import { BATTLE_BONUS_COINS, BATTLE_BONUS_XP, FOE_DAMAGE, HERO_HP } from '../constants/battle.constants';
import type { BattleRun } from '../interfaces/battle-run.interface';
import { BattleCancelled, type BattleContext, type BattleView } from '../interfaces/battle-view.interface';
import { answerQuestion, nextQuestion, questionsFor, shuffleChoices, startRun } from './battle-run.service';

/** The last question order per monster during this visit, so a retry never repeats it. */
const lastOrders = new Map<string, string>();

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
  const { run, order } = startRun(questionsFor(context.monster.subject), lastOrders.get(context.monster.id));
  lastOrders.set(context.monster.id, order);
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
  await view.say(text().go(context.heroName()));
  await view.wait(600);

  for (;;) {
    let outcome: 'next' | 'win' | 'lose' = 'next';
    while (outcome === 'next') {
      const asked = nextQuestion(run);
      run = asked.run;
      const question = asked.question;
      const choices = shuffleChoices(question);
      view.setTopic(context.pick(SCHOOL_SUBJECTS[question.subject].name));
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
        await view.say(`${text().foeHit(foe(), FOE_DAMAGE)} ${why}`);
      } else {
        const right = context.pick(choices.find((choice) => choice.correct)?.option ?? '');
        await view.say(text().wrongMove(foe()));
        await view.foeAttacks();
        view.setHp('me', run.heroHp, HERO_HP);
        await view.heroHurt();
        await view.wait(500);
        await view.say(`${text().heroHurt(context.heroName(), context.monster.hit)} ${text().answerWas} ${right}. ${why}`);
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
  view.setRecord(context.recordResult(won));

  if (won) {
    await view.foeFalls();
    await view.heroCheers();
    await view.say(`${text().foeFainted(foe)} ${text().winStats(run.right, run.wrong)}`);
    await view.waitForMore();
    if (context.claimFirstWin()) {
      context.celebrate();
      await view.say(text().reward(hero, BATTLE_BONUS_XP, BATTLE_BONUS_COINS));
      await view.waitForMore();
    }
  } else {
    await view.heroFalls();
    await view.wait(700);
    await view.say(text().heroFainted(hero));
    await view.waitForMore();
  }

  const missed = Object.entries(run.missed) as [keyof typeof SCHOOL_SUBJECTS, number][];
  if (missed.length > 0) {
    await view.say(text().weakTopics(missed.map(([subject, times]) => `${context.pick(SCHOOL_SUBJECTS[subject].name)} (${times})`).join(', ')));
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

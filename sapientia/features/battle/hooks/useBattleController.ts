'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Monster } from '@/features/characters';
import type { ArenaPart, BattleArenaHandle } from '../components/BattleArena';
import { usePahlawan } from '@/features/pahlawan/hooks/usePahlawan';
import { useStudentProgress } from '@/features/student-dashboard/hooks/useStudentProgress';
import { burstCoins } from '@/shared/feedback/coin-burst';
import { useLanguage, useMessages } from '@/shared/i18n/useLanguage';
import { prefersReducedMotion } from '@/shared/services/motion.service';
import { TYPE_MS_PER_CHARACTER } from '../constants/battle.constants';
import { BATTLE_MESSAGES } from '../i18n/battle.messages';
import type { BattleRecord } from '../interfaces/battle-run.interface';
import { BattleCancelled, type BattleSide, type BattleView } from '../interfaces/battle-view.interface';
import { runBattle } from '../services/battle-script.service';
import { battleStatsStore, recordBattle, recordFor } from '../services/battle-stats.store';
import arena from '../styles/BattleArena.module.css';

export interface HpState {
  hp: number;
  max: number;
  /** Jump straight to the value (a new run) instead of draining. */
  instant: boolean;
}

/** The battle screen's elements, owned by the dialog and the arena; the controller only uses them inside effects and handlers. */
export interface BattleRefs {
  arena: RefObject<BattleArenaHandle | null>;
  textBox: RefObject<HTMLDivElement | null>;
  text: RefObject<HTMLSpanElement | null>;
  more: RefObject<HTMLButtonElement | null>;
}

export interface BattleController {
  topic: string;
  /** The whole current line for screen readers; the visible text is typed. */
  liveText: string;
  moreVisible: boolean;
  menuLabels: string[] | null;
  hp: Record<BattleSide, HpState>;
  record: BattleRecord;
  pickMore: () => void;
  pickOption: (index: number) => void;
  /** Finish the line being typed at once (a click or Enter on the text box). */
  skipTyping: () => void;
  isTyping: () => boolean;
}

const ARENA_PARTS: readonly ArenaPart[] = ['arena', 'foeStage', 'meStage', 'foeFigure', 'meFigure', 'slash'];

const ANIMATION_CLASSES = [
  arena.lungeMe, arena.lungeFoe, arena.hitFoe, arena.hitMe, arena.cheer,
  arena.faint, arena.shake, arena.slideFoe, arena.slideMe, arena.slash,
];

/**
 * Runs one quiz battle against `monster` while it is set. It implements BattleView on top of the dialog's DOM refs, starts the
 * battle script, and cancels it (every pending wait rejects) when the monster changes or the dialog unmounts.
 */
export function useBattleController(
  monster: Monster | null,
  refs: BattleRefs,
  onRequestClose: () => void,
  onLevelUp: (level: number) => void,
): BattleController {
  const [topic, setTopic] = useState('');
  const [liveText, setLiveText] = useState('');
  const [moreVisible, setMoreVisible] = useState(false);
  const [menuLabels, setMenuLabels] = useState<string[] | null>(null);
  const [hp, setHp] = useState<Record<BattleSide, HpState>>({
    foe: { hp: 0, max: 1, instant: true },
    me: { hp: 0, max: 1, instant: true },
  });
  const [record, setRecord] = useState<BattleRecord>({ attempts: 0, wins: 0 });

  // The script runs for minutes; it reads the latest language, name and progress through this ref instead of a stale render.
  const messages = useMessages(BATTLE_MESSAGES);
  const { pick } = useLanguage();
  const { displayName } = usePahlawan();
  const progress = useStudentProgress();
  const latest = useRef({ messages, pick, displayName, progress, onRequestClose, onLevelUp });
  useEffect(() => {
    latest.current = { messages, pick, displayName, progress, onRequestClose, onLevelUp };
  });

  const typing = useRef(false);
  const skip = useRef(false);
  const resolveMore = useRef<(() => void) | null>(null);
  const resolveMenu = useRef<((index: number) => void) | null>(null);

  useEffect(() => {
    if (!monster) return undefined;
    let live = true;
    const pending = new Set<(error: BattleCancelled) => void>();
    let pendingLevel: number | null = null;

    // Every wait goes through here, so closing the dialog rejects whatever the script is waiting on.
    const cancellable = <T,>(start: (resolve: (value: T) => void) => void) =>
      new Promise<T>((resolve, reject) => {
        if (!live) {
          reject(new BattleCancelled());
          return;
        }
        pending.add(reject);
        start((value) => {
          pending.delete(reject);
          if (live) resolve(value);
          else reject(new BattleCancelled());
        });
      });

    const wait = (ms: number) => cancellable<void>((done) => setTimeout(done, prefersReducedMotion() ? Math.min(ms, 40) : ms));

    const playClass = async (element: HTMLElement | null, className: string, ms: number) => {
      if (!element) return;
      element.classList.remove(className);
      void element.offsetWidth; // restart the animation if the same class is played twice in a row
      element.classList.add(className);
      try {
        await wait(ms);
      } finally {
        element.classList.remove(className);
      }
    };

    const part = (name: ArenaPart) => refs.arena.current?.element(name) ?? null;
    const playSprite = async (side: BattleSide, action: 'attack' | 'hit' | 'die', hold = false) => {
      await refs.arena.current?.sprite(side)?.play(action, { hold, wait });
    };

    const view: BattleView = {
      say(text) {
        setLiveText(text);
        setMoreVisible(false);
        const box = refs.text.current;
        if (!box) return wait(0);
        if (prefersReducedMotion() || text === '') {
          box.textContent = text;
          return wait(0);
        }
        skip.current = false;
        typing.current = true;
        let shown = 0;
        return cancellable<void>((done) => {
          const tick = () => {
            if (!live) {
              typing.current = false;
              return;
            }
            shown = skip.current ? text.length : shown + 1;
            box.textContent = text.slice(0, shown);
            if (shown >= text.length) {
              typing.current = false;
              done();
            } else {
              setTimeout(tick, TYPE_MS_PER_CHARACTER);
            }
          };
          tick();
        });
      },
      setTopic,
      waitForMore() {
        setMoreVisible(true);
        requestAnimationFrame(() => refs.more.current?.focus());
        return cancellable<void>((done) => {
          resolveMore.current = done;
        });
      },
      choose(labels) {
        setMenuLabels(labels);
        return cancellable<number>((done) => {
          resolveMenu.current = done;
        });
      },
      wait,
      setHp(side, value, max, instant = false) {
        setHp((current) => ({ ...current, [side]: { hp: Math.max(0, value), max, instant } }));
      },
      setRecord,
      resetArena() {
        const characterMoves = [monster.moves.attack, monster.moves.hit, monster.moves.impact]
          .filter((name): name is string => Boolean(name));
        for (const name of ARENA_PARTS) part(name)?.classList.remove(...ANIMATION_CLASSES, ...characterMoves);
        refs.arena.current?.sprite('foe')?.reset();
        refs.arena.current?.sprite('me')?.reset();
      },
      async slideIn() {
        await Promise.all([playClass(part('foeStage'), arena.slideFoe, 800), playClass(part('meStage'), arena.slideMe, 800)]);
      },
      async heroAttacks() {
        await Promise.all([playClass(part('meStage'), arena.lungeMe, 520), playSprite('me', 'attack')]);
      },
      async foeHurt() {
        await Promise.all([
          playClass(part('slash'), arena.slash, 420),
          playClass(part('foeFigure'), monster.moves.hit ?? arena.hitFoe, 620),
          playSprite('foe', 'hit'),
        ]);
      },
      async foeAttacks() {
        await Promise.all([playClass(part('foeStage'), monster.moves.attack ?? arena.lungeFoe, 520), playSprite('foe', 'attack')]);
      },
      async heroHurt() {
        await Promise.all([
          playClass(part('arena'), monster.moves.impact ?? arena.shake, 500),
          playClass(part('meFigure'), arena.hitMe, 620),
          playSprite('me', 'hit'),
        ]);
      },
      async foeFalls() {
        await playSprite('foe', 'die', true);
        part('foeFigure')?.classList.add(arena.faint);
      },
      async heroCheers() {
        await playClass(part('meFigure'), arena.cheer, 800);
      },
      async heroFalls() {
        await playSprite('me', 'die', true);
        part('meFigure')?.classList.add(arena.faint);
      },
      close() {
        latest.current.onRequestClose();
      },
    };

    // Start once the dialog has painted, so every ref points at its element.
    const frame = requestAnimationFrame(() => {
      setRecord(recordFor(battleStatsStore.getSnapshot(), monster.id));
      setMenuLabels(null);
      setTopic('');
      refs.textBox.current?.focus(); // not the close button, so a stray Enter or Space while a line is typing never closes the fight
      void runBattle(view, {
        monster,
        messages: () => latest.current.messages,
        pick: (value) => latest.current.pick(value),
        heroName: () => latest.current.displayName,
        recordResult: (won) => recordBattle(monster.id, won),
        claimFirstWin: () => {
          const result = latest.current.progress.claimBattleWin(monster.id);
          if (result.levelUp) pendingLevel = result.levelUp;
          return result.firstWin;
        },
        celebrate: burstCoins,
      });
    });

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      typing.current = false;
      pending.forEach((reject) => reject(new BattleCancelled()));
      pending.clear();
      resolveMore.current = null;
      resolveMenu.current = null;
      // A level reached in battle is celebrated once the fight is closed, so the two dialogs never stack.
      if (pendingLevel) latest.current.onLevelUp(pendingLevel);
    };
    // The refs are stable objects; only a new monster starts a new fight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monster]);

  return {
    topic,
    liveText,
    moreVisible,
    menuLabels,
    hp,
    record,
    pickMore: () => {
      setMoreVisible(false);
      const done = resolveMore.current;
      resolveMore.current = null;
      done?.();
    },
    pickOption: (index) => {
      setMenuLabels(null);
      const done = resolveMenu.current;
      resolveMenu.current = null;
      done?.(index);
    },
    skipTyping: () => {
      if (typing.current) skip.current = true;
    },
    isTyping: () => typing.current,
  };
}

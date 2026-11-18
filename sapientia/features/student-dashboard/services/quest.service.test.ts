import { describe, expect, it } from 'vitest';
import { QUEST_COINS, QUEST_XP } from '../constants/board.constants';
import { dueStatus, questFromHomework } from './quest.service';

describe('quests from homework', () => {
  it('turns a piece of homework into a room that pays the one rate', () => {
    expect(questFromHomework({
      id: 'h1', subjectName: 'Sains', teacherName: 'Cikgu Azman', title: 'Kitaran air', details: null, dueOn: '2026-11-20', handedIn: true,
    })).toEqual({
      id: 'h1', subjectName: 'Sains', teacherName: 'Cikgu Azman', title: 'Kitaran air', details: null, dueOn: '2026-11-20',
      xp: QUEST_XP, coins: QUEST_COINS, handedIn: true,
    });
  });

  it('places a due date against today', () => {
    expect(dueStatus('2026-11-18', '2026-11-19')).toBe('overdue');
    expect(dueStatus('2026-11-19', '2026-11-19')).toBe('today');
    expect(dueStatus('2026-11-20', '2026-11-19')).toBe('tomorrow');
    expect(dueStatus('2026-11-23', '2026-11-19')).toBe('later');
  });
});

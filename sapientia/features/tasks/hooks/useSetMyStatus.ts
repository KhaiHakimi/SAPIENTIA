'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AssignmentStatus } from '../interfaces/task.interface';
import { setMyStatus, TASKS_KEY } from '../services/tasks.client';

/** Moves the caller's own card, then refreshes every task list and detail (a move changes two board columns at once). */
export function useSetMyStatus(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: AssignmentStatus) => setMyStatus(taskId, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

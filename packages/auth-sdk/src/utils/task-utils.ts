import { Task } from '../types';

/**
 * Normalize tasks - ensure boolean fields are properly typed
 */
export function normalizeTasks(tasks: Task[]): Task[] {
  return tasks.map((task) => ({
    ...task,
    completed: Boolean(task.completed),
  }));
}

/**
 * Normalize a single task
 */
export function normalizeTask(task: Task): Task {
  return {
    ...task,
    completed: Boolean(task.completed),
  };
}

/**
 * Check if a task is overdue
 */
export function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (Boolean(task.completed)) return false;

  const dueDate = new Date(task.dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < now;
}

/**
 * Filter tasks by search query
 */
export function filterTasksByQuery(tasks: Task[], query: string): Task[] {
  if (!query.trim()) {
    return tasks;
  }

  const normalizedQuery = query.toLowerCase().trim();
  return tasks.filter((task) => task.description.toLowerCase().includes(normalizedQuery));
}

/**
 * Sort tasks by various criteria
 */
export type SortOption = 'default' | 'dueDate' | 'completed' | 'alphabetical';

export function sortTasks(tasks: Task[], sortBy: SortOption): Task[] {
  const sorted = [...tasks];

  switch (sortBy) {
    case 'dueDate':
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      break;

    case 'completed':
      sorted.sort((a, b) => {
        const aCompleted = Boolean(a.completed);
        const bCompleted = Boolean(b.completed);
        if (aCompleted === bCompleted) return 0;
        return aCompleted ? 1 : -1;
      });
      break;

    case 'alphabetical':
      sorted.sort((a, b) => a.description.localeCompare(b.description));
      break;

    default:
      // Keep original order (by order field)
      sorted.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  return sorted;
}

/**
 * Get formatted sort option label
 */
export function getSortLabel(sortBy: SortOption): string {
  switch (sortBy) {
    case 'default':
      return 'Default';
    case 'dueDate':
      return 'Due Date';
    case 'completed':
      return 'Status';
    case 'alphabetical':
      return 'A-Z';
    default:
      return 'Default';
  }
}

/**
 * Calculate steps progress percentage
 */
export function calculateStepsProgress(steps: { completed: boolean }[]): number {
  if (steps.length === 0) return 0;
  const completedSteps = steps.filter((s) => Boolean(s.completed)).length;
  return (completedSteps / steps.length) * 100;
}

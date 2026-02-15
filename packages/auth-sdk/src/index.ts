// Export all services
export { authService, AuthService } from './services/auth.service';
export { usersService, UsersService } from './services/users.service';
export { listsService, ListsService } from './services/lists.service';
export { tasksService, TasksService } from './services/tasks.service';
export { stepsService, StepsService } from './services/steps.service';
export { remindersService, RemindersService } from './services/reminders.service';
export { sharingService, SharingService } from './services/sharing.service';
export { taskSharingService, TaskSharingService } from './services/task-sharing.service';

// Export API client
export { apiClient, ApiClient } from './utils/api-client';

// Export types
export * from './types';
export { CompletionPolicy } from './types';

// Re-export i18n utilities for easier importing (Metro compatibility)
export * from './i18n';

// Export config
export { API_CONFIG, getApiUrl, getAssetUrl, configure, getTurnstileSiteKey } from './config';

// Export storage utilities
export { TokenStorage } from './utils/storage';

// Export shared reminder types and helpers (web + mobile)
export * from './reminders';
// Explicit named re-exports so bundlers (Vite pre-bundle) pick them up
export {
  formatReminderDisplay,
  formatTimeForDisplay,
  type FormatReminderOptions,
} from './reminders';

// Export validation, error and task utilities
export * from './utils/dateTimeValidation';
export * from './utils/error-extraction';
export * from './utils/task-utils';

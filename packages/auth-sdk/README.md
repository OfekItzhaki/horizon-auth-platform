# Frontend Services

TypeScript service layer for interacting with the Tasks Management API. Works with any front-end framework (React, Vue, Angular, etc.).

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Setup

```typescript
import { authService, listsService, tasksService } from '@tasks-management/frontend-services';

// Configure API base URL (optional, defaults to http://localhost:3000)
import { API_CONFIG } from '@tasks-management/frontend-services';
API_CONFIG.baseURL = 'https://api.example.com';
```

### Authentication

```typescript
import { authService } from '@tasks-management/frontend-services';

// Login
const response = await authService.login({
  email: 'user@example.com',
  password: 'password123',
});
// Token is automatically stored

// Check if authenticated
if (authService.isAuthenticated()) {
  // User is logged in
}

// Logout
authService.logout();
```

### Working with Lists

```typescript
import { listsService } from '@tasks-management/frontend-services';

// Get all lists
const lists = await listsService.getAll();

// Create a list
const newList = await listsService.create({
  name: 'My List',
  type: 'CUSTOM',
});

// Update a list
await listsService.update(listId, {
  name: 'Updated Name',
});

// Delete a list
await listsService.delete(listId);
```

### Working with Tasks

```typescript
import { tasksService } from '@tasks-management/frontend-services';

// Get all tasks
const tasks = await tasksService.getAll();

// Get tasks for a specific list
const listTasks = await tasksService.getAll(listId);

// Create a task with multiple reminders
const task = await tasksService.create(listId, {
  description: 'Renew vehicle registration',
  dueDate: '2024-12-31T00:00:00Z',
  reminderDaysBefore: [7, 1], // 7 days and 1 day before
});

// Get tasks for a specific date
const todayTasks = await tasksService.getByDate('2024-12-25');
```

### Working with Steps

```typescript
import { stepsService } from '@tasks-management/frontend-services';

// Get steps for a task
const steps = await stepsService.getByTask(taskId);

// Create a step
await stepsService.create(taskId, {
  description: 'Step 1',
  completed: false,
});

// Reorder steps
await stepsService.reorder(taskId, [3, 1, 2]); // New order
```

### Working with Reminders

```typescript
import { remindersService } from '@tasks-management/frontend-services';

// Get today's reminders
const todayReminders = await remindersService.getToday();

// Get reminders for a specific date
const reminders = await remindersService.getByDate('2024-12-25');

// Get reminders for a date range (for scheduling)
const upcomingReminders = await remindersService.getByRange('2024-12-25', '2024-12-31');

// Each reminder has:
// - title: "Reminder: Task description"
// - message: "Task is due in X days"
// - taskId, dueDate, reminderDate, etc.
```

### Working with List Sharing

```typescript
import { sharingService } from '@tasks-management/frontend-services';

// Share a list
await sharingService.shareList(listId, {
  sharedWithId: userId,
});

// Get lists shared with me
const sharedLists = await sharingService.getSharedLists(myUserId);

// Get users a list is shared with
const shares = await sharingService.getListShares(listId);

// Unshare a list
await sharingService.unshareList(listId, userId);
```

## Error Handling

All services throw `ApiError` objects:

```typescript
import { ApiError } from '@tasks-management/frontend-services';

try {
  await listsService.create({ name: 'My List' });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.statusCode}: ${error.message}`);
  }
}
```

## Token Management

Tokens are automatically stored in localStorage. You can also manage them manually:

```typescript
import { TokenStorage } from '@tasks-management/frontend-services';

// Get token
const token = TokenStorage.getToken();

// Set token manually
TokenStorage.setToken(token);

// Remove token
TokenStorage.removeToken();
```

## Configuration

Set the API base URL via environment variable or directly:

```typescript
import { API_CONFIG } from '@tasks-management/frontend-services';

// Set base URL
API_CONFIG.baseURL = 'https://api.example.com';

// Or use environment variable
// API_BASE_URL=https://api.example.com
```

## Shared Reminder Module

Reminder types and helpers are shared between web-app and mobile-app:

```typescript
import {
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  DAY_NAMES,
  convertBackendToReminders,
  convertRemindersToBackend,
  formatReminderDisplay,
} from '@tasks-management/frontend-services';

// ReminderConfig includes: id, timeframe, time, specificDate, customDate,
// dayOfWeek, daysBefore, hasAlarm, location (optional)

const reminders = convertBackendToReminders(
  task.reminderDaysBefore,
  task.specificDayOfWeek,
  task.dueDate,
  task.reminderConfig,
);

const backend = convertRemindersToBackend(reminders, dueDate);
const label = formatReminderDisplay(reminder, t); // t optional for i18n
```

## TypeScript Support

Full TypeScript support with all types exported:

```typescript
import {
  User,
  Task,
  ToDoList,
  ReminderNotification,
  ReminderConfig,
  ReminderTimeframe,
  ReminderSpecificDate,
  CreateTaskDto,
  // ... all types
} from '@tasks-management/frontend-services';
```

## Framework Examples

### React

```tsx
import { useEffect, useState } from 'react';
import { listsService, ToDoList } from '@tasks-management/frontend-services';

function ListsComponent() {
  const [lists, setLists] = useState<ToDoList[]>([]);

  useEffect(() => {
    listsService.getAll().then(setLists);
  }, []);

  return (
    <div>
      {lists.map((list) => (
        <div key={list.id}>{list.name}</div>
      ))}
    </div>
  );
}
```

### Vue

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { listsService, ToDoList } from '@tasks-management/frontend-services';

const lists = ref<ToDoList[]>([]);

onMounted(async () => {
  lists.value = await listsService.getAll();
});
</script>
```

## Building

```bash
npm run build
```

Output will be in the `dist/` folder with TypeScript declarations.

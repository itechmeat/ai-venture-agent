# Руководство по разработке для проекта DeepVest

## Содержание

1. [Общие принципы](#общие-принципы)
2. [Архитектура проекта](#архитектура-проекта)
3. [API Development](#api-development)
4. [Frontend Components](#frontend-components)
5. [State Management](#state-management)
6. [Database & Supabase](#database--supabase)
7. [Types & Validation](#types--validation)
8. [File Organization](#file-organization)
9. [Code Style](#code-style)
10. [Testing](#testing)
11. [Performance](#performance)
12. [Security](#security)

---

## Общие принципы

### DRY (Don't Repeat Yourself)

- **ЗАПРЕЩЕНО**: Копировать код между компонентами/файлами
- **ОБЯЗАТЕЛЬНО**: Выносить повторяющуюся логику в утилиты, хуки или компоненты
- **ПРИМЕР**: Вместо дублирования обработки форм создать `useFormHandler` хук

### Single Responsibility Principle

- Каждая функция/компонент должны иметь одну четко определенную задачу
- Размер функции не должен превышать 20-30 строк
- Компонент должен решать только одну проблему

### Separation of Concerns

- Бизнес-логика отделена от UI
- API слой изолирован от компонентов
- Валидация вынесена в отдельные модули

---

## Архитектура проекта

### Структура директорий (ОБЯЗАТЕЛЬНАЯ)

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (только маршрутизация)
│   ├── (pages)/           # Page components
│   └── globals.css        # Глобальные стили
├── components/            # React компоненты
│   ├── ui/               # Базовые UI компоненты
│   ├── forms/            # Компоненты форм
│   ├── layout/           # Layout компоненты
│   └── [feature]/        # Компоненты по фичам
├── hooks/                # Custom React хуки
├── lib/                  # Библиотеки и утилиты
│   ├── api/              # API клиенты и middleware
│   ├── auth/             # Аутентификация
│   ├── supabase/         # Supabase helpers
│   ├── utils/            # Утилитарные функции
│   ├── validations/      # Zod схемы
│   └── constants/        # Константы
├── types/                # TypeScript типы
└── styles/               # Стили
```

### Правила именования файлов

- **PascalCase**: React компоненты (`UserProfile.tsx`)
- **kebab-case**: API routes (`team-members.ts`)
- **camelCase**: Хуки, утилиты (`useApiQuery.ts`)
- **UPPER_CASE**: Константы (`API_ROUTES.ts`)

---

## API Development

### ОБЯЗАТЕЛЬНЫЕ правила для API routes

#### 1. Использование базового обработчика

```typescript
// ❌ НЕПРАВИЛЬНО
export async function GET(request: NextRequest) {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      // ... дублированный код
    };

    // аутентификация
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    // ... еще дублированный код

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    // дублированная обработка ошибок
  }
}

// ✅ ПРАВИЛЬНО
export const GET = createAPIHandler(async (request, params) => {
  const user = await requireAuth(request);
  const { id: projectId } = await params;

  await requireProjectPermission(user.id, projectId, 'viewer');

  const result = await getProjectData(projectId);
  return result;
});
```

#### 2. Структура API response (ОБЯЗАТЕЛЬНАЯ)

```typescript
// Все API должны возвращать единообразный формат
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime: number;
    [key: string]: any;
  };
}
```

#### 3. Обработка ошибок

```typescript
// ❌ НЕПРАВИЛЬНО - разные форматы ошибок
return NextResponse.json({ error: 'Failed' }, { status: 500 });
return NextResponse.json({ message: 'Error' }, { status: 400 });

// ✅ ПРАВИЛЬНО - использовать APIError
throw new APIError('User not found', 404);
throw new APIError('Validation failed', 400);
```

#### 4. Валидация входных данных

```typescript
// ❌ НЕПРАВИЛЬНО
const body = await request.json();
if (!body.name) {
  return NextResponse.json({ error: 'Name required' }, { status: 400 });
}

// ✅ ПРАВИЛЬНО
const body = await request.json();
const validatedData = ValidationSchemas.project.create.parse(body);
```

### Middleware Rules

#### ОБЯЗАТЕЛЬНО использовать для:

- Аутентификация: `requireAuth()`
- Проверка разрешений: `requireProjectPermission()`
- CORS: автоматически в `createAPIHandler`
- Логирование: автоматически в базовом обработчике

---

## Frontend Components

### Компоненты форм

#### ЗАПРЕЩЕНО создавать inline стилизованные input'ы

```typescript
// ❌ НЕПРАВИЛЬНО
<input
  style={{
    width: '100%',
    padding: '10px 12px',
    borderRadius: 'var(--radius-2)',
    // ... повторяющиеся стили
  }}
/>
```

#### ОБЯЗАТЕЛЬНО использовать базовые компоненты

```typescript
// ✅ ПРАВИЛЬНО
import { StyledInput, FormField } from '@/components/forms';

<StyledInput
  id="name"
  label="Project Name"
  placeholder="Enter name"
  register={register}
  error={errors.name}
  icon={ProjectIcon}
/>
```

### Правила создания компонентов

#### 1. Размер компонента

- **Максимум 150 строк** на компонент
- Если больше - разбить на sub-компоненты
- Выносить сложную логику в custom hooks

#### 2. Структура компонента и стилей (ОБЯЗАТЕЛЬНО)

```
components/
├── ui/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.module.scss
│   └── Card/
│       ├── Card.tsx
│       ├── Card.module.scss
```

#### ЗАПРЕЩЕНО использовать inline стили в JSX

```typescript
// ❌ НЕПРАВИЛЬНО
<div style={{
  padding: '16px',
  backgroundColor: 'var(--flow-green)',
  borderRadius: '8px'
}}>
  Content
</div>

// ✅ ПРАВИЛЬНО
import styles from './Card.module.scss';

<div className={styles.card}>
  Content
</div>
```

#### 3. Props interface

```typescript
// ✅ ПРАВИЛЬНО - всегда определять интерфейс
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function UserCard({ user, onEdit, className, variant = 'detailed' }: UserCardProps) {
  // ...
}
```

#### 4. Default exports vs Named exports

- **Default exports**: Только для page компонентов
- **Named exports**: Все остальные компоненты

```typescript
// ✅ Page компоненты
export default function ProjectPage() {}

// ✅ Обычные компоненты
export function UserCard() {}
export function ProjectForm() {}
```

#### 5. Структура файлов компонента

```typescript
// components/ui/Button/Button.tsx
import React from 'react';
import styles from './Button.module.scss';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function Button({ variant = 'primary', size = 'md', children, className }: ButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${styles[size]} ${className || ''}`}>
      {children}
    </button>
  );
}

// components/ui/Button/Button.tsx
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';
```

---

## State Management

### React Query Rules

#### 1. Всегда использовать базовые хуки

```typescript
// ❌ НЕПРАВИЛЬНО
const { data, error } = useQuery({
  queryKey: ['projects', projectId],
  queryFn: async () => {
    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },
});

// ✅ ПРАВИЛЬНО
const { data, error } = useApiQuery<Project>(`/projects/${projectId}`);
```

#### 2. Query Keys стандарт

```typescript
// ОБЯЗАТЕЛЬНАЯ структура query keys
const QUERY_KEYS = {
  projects: {
    all: ['projects'] as const,
    lists: () => [...QUERY_KEYS.projects.all, 'list'] as const,
    list: (filters: string) => [...QUERY_KEYS.projects.lists(), filters] as const,
    details: () => [...QUERY_KEYS.projects.all, 'detail'] as const,
    detail: (id: string) => [...QUERY_KEYS.projects.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    // ...
  },
} as const;
```

#### 3. Mutations стандарт

```typescript
// ✅ Использовать базовый хук
const createProject = useApiMutation<Project, CreateProjectData>('/projects', 'POST', {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all });
    router.push('/projects');
  },
});
```

### Form State

#### ОБЯЗАТЕЛЬНО использовать react-hook-form + zod

```typescript
// ✅ ПРАВИЛЬНО
const form = useFormHandler({
  schema: ValidationSchemas.project.create,
  onSubmit: async data => {
    return await createProject.mutateAsync(data);
  },
  onSuccess: () => router.push('/projects'),
});
```

---

## Database & Supabase

### Repository Pattern (ОБЯЗАТЕЛЬНО)

#### 1. Все запросы через репозитории

```typescript
// ❌ НЕПРАВИЛЬНО - прямые запросы в компонентах
const { data } = await supabase.from('projects').select('*');

// ✅ ПРАВИЛЬНО - через репозиторий
class ProjectRepository extends BaseRepository<Project> {
  constructor() {
    super('projects');
  }

  async findBySlug(slug: string) {
    const supabase = await this.getClient();
    return this.handleQuery(supabase.from(this.tableName).select('*').eq('slug', slug).single());
  }
}
```

#### 2. Типизация запросов

```typescript
// ✅ ОБЯЗАТЕЛЬНО типизировать все запросы
const { data, error }: { data: Project[] | null; error: string | null } =
  await projectRepository.findMany();
```

#### 3. Error Handling

```typescript
// ✅ Единообразная обработка ошибок
protected async handleQuery<T>(
  query: Promise<PostgrestResponse<T>>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await query;
    return { data, error: error?.message || null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### RLS Policies Rules

#### ЗАПРЕЩЕНО обходить RLS в коде

```typescript
// ❌ НЕПРАВИЛЬНО
const supabase = createClient(url, SERVICE_ROLE_KEY); // Обход RLS

// ✅ ПРАВИЛЬНО - использовать RLS policies
const supabase = createClient(url, ANON_KEY); // Соблюдение RLS
```

---

## Types & Validation

### TypeScript Rules

#### 1. Никаких `any` типов

```typescript
// ❌ ЗАПРЕЩЕНО
function processData(data: any) {}

// ✅ ПРАВИЛЬНО
function processData<T extends Record<string, unknown>>(data: T) {}
```

#### 2. Структура типов

```typescript
// ✅ Организация типов по модулям
// types/project.ts
export interface Project extends BaseEntity {
  slug: string;
  // ...
}

// types/index.ts
export * from './project';
export * from './user';
export * from './common';
```

#### 3. Validation Schemas

#### ОБЯЗАТЕЛЬНО использовать центральные схемы

```typescript
// ❌ НЕПРАВИЛЬНО - создание схем в компонентах
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// ✅ ПРАВИЛЬНО - использование центральных схем
const schema = ValidationSchemas.user.create;
```

#### Правила создания схем валидации

```typescript
// ✅ Структура схемы
export const userCreateSchema = z.object({
  // Обязательные поля без default
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),

  // Опциональные поля с transform
  email: z.string().email('Invalid email format').optional().or(z.literal('')),

  // Поля с default значениями
  isActive: z.boolean().default(true),
});

// Экспорт типов
export type UserCreateForm = z.infer<typeof userCreateSchema>;
```

---

## File Organization

### Import/Export Rules

#### 1. Порядок импортов (ОБЯЗАТЕЛЬНЫЙ)

```typescript
// 1. React и Next.js
import React from 'react';
import { NextRequest } from 'next/server';

// 2. Внешние библиотеки
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

// 3. Внутренние модули (абсолютные пути)
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { APIClient } from '@/lib/api/client';

// 4. Относительные импорты
import './styles.css';
import { helper } from '../utils/helper';

// 5. Типы (в конце)
import type { User } from '@/types/user';
```

#### 2. Barrel exports

```typescript
// ✅ В каждой директории index.ts
// components/forms/index.ts
export { StyledInput } from './StyledInput';
export { FormField } from './FormField';
export { FileUpload } from './FileUpload';

// Использование
import { StyledInput, FormField } from '@/components/forms';
```

#### 3. Запрет на глубокие импорты

```typescript
// ❌ ЗАПРЕЩЕНО
import { StyledInput } from '@/components/forms/StyledInput/StyledInput';

// ✅ ПРАВИЛЬНО
import { StyledInput } from '@/components/forms';
```

---

## Code Style

### Naming Conventions

#### Variables & Functions

```typescript
// ✅ camelCase
const userName = 'john';
const isLoggedIn = true;
function getUserData() {}
```

#### Constants

```typescript
// ✅ UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_FILE_SIZE = 1024 * 1024;
```

#### Components & Types

```typescript
// ✅ PascalCase
interface UserProfile {}
type ProjectStatus = 'active' | 'inactive';
function UserCard() {}
```

#### Files & Directories

```typescript
// ✅ kebab-case для файлов
// user-profile.ts
// api-client.ts

// ✅ PascalCase для компонентов
// UserProfile.tsx
// ProjectCard.tsx
```

### Function Declarations

#### Предпочитать function declarations для именованных функций

```typescript
// ✅ ПРАВИЛЬНО
function calculateScore(data: ProjectData): number {
  return data.metrics.reduce((sum, metric) => sum + metric.value, 0);
}

// ✅ Arrow functions для callbacks и short functions
const mapProjects = (projects: Project[]) => projects.map(p => p.name);

// ❌ Избегать arrow functions для основных функций
const calculateScore = (data: ProjectData): number => {
  // сложная логика...
};
```

### Comments & Documentation

#### JSDoc для публичных функций (ОБЯЗАТЕЛЬНО)

```typescript
/**
 * Создает новый проект с валидацией данных
 * @param projectData - Данные проекта для создания
 * @param userId - ID пользователя-создателя
 * @returns Promise с созданным проектом или ошибкой
 * @throws {ValidationError} Когда данные проекта невалидны
 */
async function createProject(
  projectData: CreateProjectData,
  userId: string,
): Promise<{ data: Project | null; error: string | null }> {
  // implementation
}
```

#### TODO комментарии

```typescript
// TODO: [JIRA-123] Оптимизировать запрос когда будет готов индекс
// FIXME: Временное решение, нужно рефакторить после релиза
// NOTE: Это поведение специально для совместимости с legacy API
```

---

## Testing

### Testing Strategy

#### 1. Unit Tests (ОБЯЗАТЕЛЬНО для утилит)

```typescript
// utils/format.test.ts
describe('formatters', () => {
  describe('formatDate', () => {
    it('should format date in long format', () => {
      const result = formatters.date('2024-01-01', 'long');
      expect(result).toBe('January 1, 2024');
    });
  });
});
```

#### 2. Integration Tests для API

```typescript
// api/projects.test.ts
describe('/api/projects', () => {
  it('should create project with valid data', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project', slug: 'test' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Test Project');
  });
});
```

#### 3. Component Tests

```typescript
// components/UserCard.test.tsx
describe('UserCard', () => {
  it('should render user information', () => {
    const user = { id: '1', name: 'John Doe' };
    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### Test Naming

```typescript
// ✅ Структура: should [expected behavior] when [condition]
it('should return error when user is not authenticated');
it('should create project when valid data provided');
it('should display loading state when data is fetching');
```

---

## Performance

### React Performance Rules

#### 1. Мемоизация компонентов

```typescript
// ✅ Мемоизировать компоненты с дорогими вычислениями
export const ProjectCard = memo(function ProjectCard({ project, onEdit }: Props) {
  const formattedDate = useMemo(() =>
    formatters.date(project.createdAt, 'relative'),
    [project.createdAt]
  );

  const handleEdit = useCallback(() => {
    onEdit?.(project);
  }, [onEdit, project]);

  return (
    // JSX
  );
});
```

#### 2. Lazy Loading

```typescript
// ✅ Lazy load тяжелых компонентов
const ProjectEditor = lazy(() => import('@/components/projects/ProjectEditor'));
const AdminPanel = lazy(() => import('@/components/admin/AdminPanel'));

// Использование с Suspense
<Suspense fallback={<ProjectEditorSkeleton />}>
  <ProjectEditor project={project} />
</Suspense>
```

#### 3. Оптимизация React Query

```typescript
// ✅ Правильная настройка staleTime и cacheTime
const { data } = useApiQuery('/projects', {
  staleTime: 5 * 60 * 1000, // 5 минут для статичных данных
  refetchOnMount: false, // Не рефетчить при каждом mount
});

// ✅ Prefetching для предсказуемых переходов
const queryClient = useQueryClient();

const handleProjectHover = useCallback(
  (projectId: string) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.projects.detail(projectId),
      queryFn: () => APIClient.get(`/projects/${projectId}`),
    });
  },
  [queryClient],
);
```

### Database Performance

#### 1. Избегать N+1 queries

```typescript
// ❌ НЕПРАВИЛЬНО - N+1 problem
async function getProjectsWithAuthors(projectIds: string[]) {
  const projects = await getProjects(projectIds);

  for (const project of projects) {
    project.author = await getUser(project.authorId); // N+1!
  }

  return projects;
}

// ✅ ПРАВИЛЬНО - batch queries
async function getProjectsWithAuthors(projectIds: string[]) {
  const [projects, authors] = await Promise.all([
    getProjects(projectIds),
    getUsers(authorIds), // Один запрос для всех авторов
  ]);

  return projects.map(project => ({
    ...project,
    author: authors.find(author => author.id === project.authorId),
  }));
}
```

#### 2. Использовать select для ограничения полей

```typescript
// ❌ НЕПРАВИЛЬНО
const { data } = await supabase.from('projects').select('*');

// ✅ ПРАВИЛЬНО
const { data } = await supabase.from('projects').select('id, name, slug, created_at').limit(10);
```

---

## Security

### Authentication Rules

#### 1. Всегда проверять аутентификацию в API

```typescript
// ✅ ОБЯЗАТЕЛЬНО в каждом protected API route
export const POST = createAPIHandler(async request => {
  const user = await requireAuth(request); // Throws если не авторизован
  // логика...
});
```

#### 2. Проверка разрешений

```typescript
// ✅ Проверять разрешения на уровне API
export const PUT = createAPIHandler(async (request, params) => {
  const user = await requireAuth(request);
  const { id: projectId } = await params;

  await requireProjectPermission(user.id, projectId, 'editor');
  // логика...
});
```

### Data Validation

#### 1. Валидация на фронтенде И бэкенде

```typescript
// ✅ Frontend валидация
const form = useFormHandler({
  schema: ValidationSchemas.project.create,
  // ...
});

// ✅ Backend валидация (ОБЯЗАТЕЛЬНО)
export const POST = createAPIHandler(async request => {
  const body = await request.json();
  const validatedData = ValidationSchemas.project.create.parse(body);
  // ...
});
```

#### 2. Санитизация input данных

```typescript
// ✅ Очищать HTML контент
import DOMPurify from 'dompurify';

function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}
```

### Environment Variables

#### ЗАПРЕЩЕНО хардкодить секреты

```typescript
// ❌ ЗАПРЕЩЕНО
const apiKey = 'sk-1234567890abcdef';

// ✅ ПРАВИЛЬНО
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
```

---

## Error Handling

### Frontend Error Boundaries

#### ОБЯЗАТЕЛЬНО использовать Error Boundaries

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Отправить в monitoring сервис
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### API Error Handling

#### Структурированные ошибки

```typescript
// ✅ Использовать типизированные ошибки
export class APIError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Использование
throw new APIError('User not found', 404, 'USER_NOT_FOUND');
throw new APIError('Validation failed', 400, 'VALIDATION_ERROR');
```

---

## Monitoring & Logging

### Логирование

#### Структурированные логи

```typescript
// ✅ Использовать структурированное логирование
import { logger } from '@/lib/logger';

logger.info('Project created', {
  projectId: project.id,
  userId: user.id,
  timestamp: new Date().toISOString(),
});

logger.error('Database connection failed', {
  error: error.message,
  operation: 'createProject',
  retryCount: 3,
});
```

#### Уровни логирования

- **ERROR**: Критические ошибки
- **WARN**: Потенциальные проблемы
- **INFO**: Важные события
- **DEBUG**: Отладочная информация (только в development)

---

## Deployment & CI/CD

### Pre-commit Hooks

#### ОБЯЗАТЕЛЬНЫЕ проверки перед коммитом

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "tsc --noEmit"],
    "*.{md,json}": ["prettier --write"]
  }
}
```

### Environment-specific Rules

#### Различия между окружениями

```typescript
// ✅ Использовать environment-specific конфигурации
const config = {
  development: {
    logLevel: 'debug',
    apiTimeout: 30000,
  },
  production: {
    logLevel: 'error',
    apiTimeout: 10000,
  },
};

export const appConfig = config[process.env.NODE_ENV as keyof typeof config];
```

---

## Code Review Checklist

### Что проверять при Code Review

#### ✅ Обязательные проверки

- [ ] Следует ли код всем правилам этого документа?
- [ ] Есть ли дублирование кода?
- [ ] Используются ли правильные типы (никаких `any`)?
- [ ] Есть ли необходимые валидации?
- [ ] Обрабатываются ли все ошибки?
- [ ] Добавлены ли необходимые тесты?
- [ ] Оптимизирована ли производительность?
- [ ] Безопасен ли код (нет XSS, SQL injection)?

#### ❌ Что должно блокировать merge

- Любое нарушение правил безопасности
- Дублирование кода без веской причины
- Использование `any` типов
- Отсутствие валидации в API
- Хардкод секретов или конфигурации

---

## Заключение

Эти правила **ОБЯЗАТЕЛЬНЫ** для всех разработчиков проекта DeepVest.

### Процесс внедрения

1. **Новый код** - должен сразу следовать всем правилам
2. **Существующий код** - рефакторить согласно [плану рефакторинга](refactoring_plan.md)
3. **Code Review** - обязательная проверка соответствия этим правилам

### Обновление правил

- Правила могут обновляться только через PR с обсуждением
- Все изменения должны быть обратно совместимыми
- Новые правила вводятся с grace period для адаптации

### Поддержка

При возникновении вопросов по правилам:

1. Проверить примеры в этом документе
2. Посмотреть реализацию в базовых компонентах/утилитах
3. Задать вопрос в команде для уточнения

**Помните**: Эти правила созданы для повышения качества кода, упрощения поддержки и ускорения разработки. Следование им сэкономит время всей команде в долгосрочной перспективе.

**Ни при каких обстоятельствах не используй команды GIT!**

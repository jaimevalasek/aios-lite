# Node + TypeScript Patterns

> Strict TypeScript, zero `any`, runtime validation at boundaries. Type safety as architecture.

---

## tsconfig.json — strict baseline

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

`strict: true` enables: `strictNullChecks`, `strictFunctionTypes`, `strictPropertyInitialization`, `noImplicitAny`.
`noUncheckedIndexedAccess` makes array/object index access return `T | undefined` — forces null checks.

---

## Runtime validation with Zod (API boundaries)

TypeScript types are erased at runtime. Use Zod at every external boundary.

```ts
import { z } from 'zod';

// Define schema once — derive type from it
export const createAppointmentSchema = z.object({
    doctorId: z.string().uuid(),
    date: z.string().datetime(),
    notes: z.string().max(500).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// Parse at boundary — throws ZodError on invalid input
export function parseCreateAppointment(raw: unknown): CreateAppointmentInput {
    return createAppointmentSchema.parse(raw);
}

// Safe parse — returns result object instead of throwing
export function safeParseAppointment(raw: unknown) {
    return createAppointmentSchema.safeParse(raw);
}
```

Validate at:
- HTTP request bodies (before controllers)
- Environment variables (at startup)
- External API responses (after fetch)
- File/config parsing

---

## Environment variables — validate at startup

```ts
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV:         z.enum(['development', 'test', 'production']),
    PORT:             z.coerce.number().default(3000),
    DATABASE_URL:     z.string().url(),
    JWT_SECRET:       z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
    STRIPE_SECRET:    z.string().startsWith('sk_'),
    ALLOWED_ORIGINS:  z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);

// Usage — always typed, never undefined
import { env } from '@/lib/env';
jwt.verify(token, env.JWT_SECRET);
```

---

## Domain types — explicit over inferred

```ts
// types/appointment.ts

// Branded types prevent ID mix-ups
type Brand<T, Name extends string> = T & { readonly _brand: Name };
export type UserId        = Brand<string, 'UserId'>;
export type DoctorId      = Brand<string, 'DoctorId'>;
export type AppointmentId = Brand<string, 'AppointmentId'>;

// Domain entity — explicit shape
export type Appointment = {
    id: AppointmentId;
    userId: UserId;
    doctorId: DoctorId;
    date: Date;
    status: AppointmentStatus;
    notes: string | null;
    createdAt: Date;
};

// Enum-like const objects instead of TypeScript enums
export const AppointmentStatus = {
    PENDING:   'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
} as const;
export type AppointmentStatus = typeof AppointmentStatus[keyof typeof AppointmentStatus];

// DTOs — separate from domain entities
export type CreateAppointmentDto = {
    doctorId: DoctorId;
    date: Date;
    notes?: string;
};
```

---

## Repository pattern — typed data access

```ts
// src/repositories/appointment.repository.ts
import type { Appointment, CreateAppointmentDto, AppointmentId } from '@/types';
import { db } from '@/lib/db';

export interface AppointmentRepository {
    findById(id: AppointmentId): Promise<Appointment | null>;
    findByUserAndDate(userId: UserId, date: Date): Promise<Appointment[]>;
    create(data: CreateAppointmentDto & { userId: UserId }): Promise<Appointment>;
    cancel(id: AppointmentId): Promise<Appointment>;
}

export const appointmentRepository: AppointmentRepository = {
    findById: async (id) =>
        db.appointment.findUnique({ where: { id } }) as Promise<Appointment | null>,

    create: async (data) =>
        db.appointment.create({ data }) as Promise<Appointment>,

    cancel: async (id) =>
        db.appointment.update({
            where: { id },
            data: { status: 'cancelled', cancelledAt: new Date() },
        }) as Promise<Appointment>,
};
```

---

## Service layer — explicit return types

Always declare return types on public functions. Helps catch refactoring errors and documents the contract.

```ts
// src/services/appointment.service.ts
import type { Appointment, CreateAppointmentDto, UserId } from '@/types';
import { appointmentRepository } from '@/repositories/appointment.repository';
import { ConflictError } from '@/lib/errors';

export async function createAppointment(
    userId: UserId,
    dto: CreateAppointmentDto
): Promise<Appointment> {
    const conflict = await appointmentRepository.findConflict(dto.doctorId, dto.date);
    if (conflict) throw new ConflictError('This time slot is already booked.');
    return appointmentRepository.create({ ...dto, userId });
}

export async function cancelAppointment(
    id: AppointmentId,
    requestingUserId: UserId
): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new NotFoundError('Appointment not found.');
    if (appointment.userId !== requestingUserId) throw new ForbiddenError();
    return appointmentRepository.cancel(id);
}
```

---

## Avoiding `any` — common patterns

```ts
// WRONG
function processWebhook(payload: any) { ... }

// RIGHT — use unknown and narrow
function processWebhook(payload: unknown): void {
    if (!isStripeEvent(payload)) throw new Error('Invalid webhook payload');
    // payload is now StripeEvent
}

function isStripeEvent(value: unknown): value is Stripe.Event {
    return typeof value === 'object'
        && value !== null
        && 'type' in value
        && typeof (value as any).type === 'string';
}

// WRONG — type assertion without safety
const user = response.data as User;

// RIGHT — parse and validate
const user = userSchema.parse(response.data);
```

---

## Async error handling

```ts
// Wrap async route handlers to avoid try/catch boilerplate
export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
    (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);

// Usage
router.post('/', asyncHandler(async (req, res) => {
    const appointment = await createAppointment(req.user!.id, req.body);
    res.status(201).json({ data: appointment });
}));
```

---

## Testing with types

```ts
// Use satisfies for test fixtures
const mockAppointment = {
    id: 'apt_123' as AppointmentId,
    userId: 'usr_456' as UserId,
    doctorId: 'doc_789' as DoctorId,
    date: new Date('2026-03-15T10:00:00Z'),
    status: 'pending',
    notes: null,
    createdAt: new Date(),
} satisfies Appointment;

// Mock repository with type safety
const mockRepo: AppointmentRepository = {
    findById: jest.fn().mockResolvedValue(mockAppointment),
    create: jest.fn().mockResolvedValue(mockAppointment),
    cancel: jest.fn().mockResolvedValue({ ...mockAppointment, status: 'cancelled' }),
    findByUserAndDate: jest.fn().mockResolvedValue([]),
    findConflict: jest.fn().mockResolvedValue(null),
};
```

---

## ALWAYS
- `strict: true` in tsconfig — no exceptions
- Zod validation at all external boundaries (HTTP, env, external APIs)
- Explicit return types on public service and repository functions
- Branded types for domain IDs to prevent mix-ups
- Interface definitions for repositories (enables mocking)
- `unknown` over `any` when type is genuinely unknown

## NEVER
- `any` in service or domain code
- Type assertions (`as SomeType`) without preceding validation
- `!` non-null assertion without a runtime check nearby
- Importing `process.env.X` directly — always go through validated env module
- Enum (TypeScript enums have runtime quirks) — use `const` objects with `as const`

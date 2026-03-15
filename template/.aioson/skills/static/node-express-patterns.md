# Node + Express Patterns

> Production-ready Express APIs. Clean layers, typed contracts, centralized error handling.

---

## Project structure

```
src/
  routes/           ← HTTP routing only
    appointments.routes.ts
    auth.routes.ts
    index.ts        ← registers all routers
  controllers/      ← request parsing, response formatting
    appointments.controller.ts
  services/         ← business logic, domain operations
    appointments.service.ts
    email.service.ts
  repositories/     ← data access layer (database queries)
    appointments.repository.ts
  middleware/
    auth.middleware.ts
    validate.middleware.ts
    error.middleware.ts
    rate-limit.middleware.ts
  schemas/          ← Zod schemas for request validation
    appointment.schema.ts
  types/
    index.ts
  lib/
    db.ts           ← database client singleton
    logger.ts       ← winston/pino logger
  app.ts            ← Express app setup (no listen)
  server.ts         ← server startup + graceful shutdown
```

---

## Layer responsibilities

```ts
// routes — HTTP wiring only
// src/routes/appointments.routes.ts
const router = Router();
router.get('/',    authenticate, AppointmentController.list);
router.post('/',   authenticate, validate(createAppointmentSchema), AppointmentController.create);
router.delete('/:id', authenticate, AppointmentController.cancel);
export default router;

// controllers — parse request, call service, return response
// src/controllers/appointments.controller.ts
export const AppointmentController = {
    create: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const appointment = await AppointmentService.create(req.user!.id, req.body);
            res.status(201).json({ data: appointment });
        } catch (err) {
            next(err);
        }
    },

    list: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await AppointmentService.listForUser(req.user!.id, { page: +page, limit: +limit });
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
};

// services — business logic
// src/services/appointments.service.ts
export const AppointmentService = {
    create: async (userId: string, data: CreateAppointmentDto): Promise<Appointment> => {
        const conflict = await AppointmentRepository.findConflict(data.doctorId, data.date);
        if (conflict) throw new ConflictError('This time slot is already booked.');

        const appointment = await AppointmentRepository.create({ ...data, userId });
        await EmailService.sendConfirmation(appointment);
        return appointment;
    },
};

// repositories — data access
// src/repositories/appointments.repository.ts
export const AppointmentRepository = {
    findConflict: async (doctorId: string, date: Date): Promise<Appointment | null> => {
        return db.appointment.findFirst({
            where: { doctorId, date, status: { not: 'cancelled' } },
        });
    },

    create: async (data: Prisma.AppointmentCreateInput): Promise<Appointment> => {
        return db.appointment.create({ data, include: { doctor: true } });
    },
};
```

---

## Validation middleware with Zod

```ts
// src/schemas/appointment.schema.ts
import { z } from 'zod';

export const createAppointmentSchema = z.object({
    body: z.object({
        doctorId: z.string().uuid('Invalid doctor ID'),
        date: z.string().datetime('Invalid date format'),
        notes: z.string().max(500).optional(),
    }),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>['body'];

// src/middleware/validate.middleware.ts
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body:   req.body,
                query:  req.query,
                params: req.params,
            });
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(422).json({
                    error: 'Validation failed',
                    details: err.flatten().fieldErrors,
                });
            }
            next(err);
        }
    };
```

---

## Authentication middleware

```ts
// src/middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.user = { id: payload.sub!, role: payload.role };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

export const requireRole = (...roles: string[]) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user!.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        next();
    };
```

---

## Centralized error handling

```ts
// src/lib/errors.ts — domain error classes
export class AppError extends Error {
    constructor(public message: string, public statusCode: number) {
        super(message);
        this.name = this.constructor.name;
    }
}
export class NotFoundError extends AppError {
    constructor(msg = 'Resource not found') { super(msg, 404); }
}
export class ConflictError extends AppError {
    constructor(msg = 'Resource conflict') { super(msg, 409); }
}
export class ForbiddenError extends AppError {
    constructor(msg = 'Forbidden') { super(msg, 403); }
}

// src/middleware/error.middleware.ts — MUST be last middleware registered
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }
    // Prisma unique constraint violation
    if (err.constructor.name === 'PrismaClientKnownRequestError' && (err as any).code === 'P2002') {
        return res.status(409).json({ error: 'A record with this value already exists.' });
    }

    logger.error({ err, url: req.url, method: req.method });
    res.status(500).json({ error: 'Internal server error.' });
};
```

---

## Rate limiting

```ts
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
});

// Strict limit for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});
```

---

## App setup

```ts
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Routes
app.use('/api/appointments', appointmentRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Error handler — always last
app.use(errorHandler);

export { app };
```

---

## Graceful shutdown

```ts
// src/server.ts
const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
        await db.$disconnect();
        logger.info('Shutdown complete.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000); // force exit after 10s
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
```

---

## ALWAYS
- Separate routes, controllers, services, repositories
- Validate at the boundary with Zod before touching services
- Use typed domain error classes (`AppError`, `NotFoundError`, etc.)
- Register the error handler middleware last
- Use `next(err)` in controllers — never `res.status(500)` inline
- Graceful shutdown on SIGTERM/SIGINT

## NEVER
- Business logic in routes or controllers
- Raw `try/catch` without `next(err)` in async controllers
- `console.log` in production — use a structured logger (pino/winston)
- `process.env.*` without validation at startup
- Skip rate limiting on auth endpoints

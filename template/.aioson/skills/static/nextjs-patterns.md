# Next.js Patterns

> App Router, Server Components, and Server Actions. Build fast by default.

---

## Mental model: Server vs Client

```
Server Components (default) → fetch data, render HTML, never ship JS to browser
Client Components           → interactivity, useState, useEffect, browser APIs
Server Actions              → mutations from forms and client events, run on server
Route Handlers              → REST-like API endpoints (for external consumers)
```

**Rule:** Start every component as a Server Component. Add `"use client"` only when you need browser APIs, state, or event handlers.

---

## Project structure (App Router)

```
src/
  app/
    (auth)/                  ← route group, no URL segment
      login/page.tsx
      register/page.tsx
      layout.tsx             ← minimal layout for auth pages
    (dashboard)/
      layout.tsx             ← authenticated shell (sidebar, nav)
      page.tsx               ← /dashboard
      appointments/
        page.tsx             ← /appointments (list)
        [id]/
          page.tsx           ← /appointments/123
          edit/page.tsx      ← /appointments/123/edit
      settings/page.tsx
    api/
      webhooks/
        stripe/route.ts      ← POST /api/webhooks/stripe
  components/
    ui/                      ← design system primitives (Button, Input, Modal)
    features/
      appointments/          ← feature-specific components
        AppointmentCard.tsx
        AppointmentList.tsx  ← Server Component (fetches data)
        BookingForm.tsx      ← Client Component (form state)
  lib/
    db.ts                    ← Prisma client singleton
    auth.ts                  ← NextAuth config
    stripe.ts                ← Stripe client
  actions/                   ← Server Actions
    appointment.actions.ts
    billing.actions.ts
  types/
    index.ts
```

---

## Data fetching — Server Components

```tsx
// app/(dashboard)/appointments/page.tsx
// No useEffect, no useState, no API call — just async/await
export default async function AppointmentsPage() {
    const session = await auth();
    if (!session) redirect('/login');

    const appointments = await db.appointment.findMany({
        where: { userId: session.user.id },
        include: { doctor: true },
        orderBy: { date: 'asc' },
        take: 50,
    });

    return (
        <div>
            <AppointmentList appointments={appointments} />
        </div>
    );
}

// With suspense for streaming
export default function Page() {
    return (
        <Suspense fallback={<AppointmentListSkeleton />}>
            <AppointmentList />
        </Suspense>
    );
}
```

---

## Server Actions — mutations

```ts
// actions/appointment.actions.ts
'use server';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createSchema = z.object({
    doctorId: z.string().uuid(),
    date: z.string().datetime(),
    notes: z.string().max(500).optional(),
});

export async function createAppointment(formData: FormData) {
    const session = await auth();
    if (!session) throw new Error('Unauthorized');

    const parsed = createSchema.safeParse({
        doctorId: formData.get('doctorId'),
        date: formData.get('date'),
        notes: formData.get('notes'),
    });

    if (!parsed.success) {
        return { error: parsed.error.flatten().fieldErrors };
    }

    // Check for conflicts
    const conflict = await db.appointment.findFirst({
        where: {
            doctorId: parsed.data.doctorId,
            date: new Date(parsed.data.date),
            status: { not: 'cancelled' },
        },
    });

    if (conflict) {
        return { error: { date: ['This time slot is not available.'] } };
    }

    await db.appointment.create({
        data: { ...parsed.data, userId: session.user.id },
    });

    revalidatePath('/appointments');
    redirect('/appointments');
}
```

Usage in a Client Component:

```tsx
'use client';

import { createAppointment } from '@/actions/appointment.actions';
import { useActionState } from 'react';

export function BookingForm({ doctors }: { doctors: Doctor[] }) {
    const [state, action, pending] = useActionState(createAppointment, null);

    return (
        <form action={action}>
            <select name="doctorId" required>
                {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
            {state?.error?.doctorId && <p className="text-red-500">{state.error.doctorId[0]}</p>}

            <input name="date" type="datetime-local" required />
            {state?.error?.date && <p className="text-red-500">{state.error.date[0]}</p>}

            <button type="submit" disabled={pending}>
                {pending ? 'Booking...' : 'Book Appointment'}
            </button>
        </form>
    );
}
```

---

## Client Components — when and how

```tsx
'use client';  // Only add when needed

// Good reasons for "use client":
// - useState, useEffect, useReducer
// - Event handlers (onClick, onChange)
// - Browser APIs (localStorage, window, navigator)
// - Third-party libs that need DOM access

import { useState } from 'react';

export function ConfirmDialog({ onConfirm }: { onConfirm: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button onClick={() => setOpen(true)}>Delete</button>
            {open && (
                <dialog open>
                    <p>Are you sure?</p>
                    <button onClick={() => { onConfirm(); setOpen(false); }}>Confirm</button>
                    <button onClick={() => setOpen(false)}>Cancel</button>
                </dialog>
            )}
        </>
    );
}
```

**Pass Server data as props — do not re-fetch in Client Components:**

```tsx
// WRONG — Client Component fetching its own data
'use client';
export function AppointmentList() {
    const [appointments, setAppointments] = useState([]);
    useEffect(() => { fetch('/api/appointments').then(...) }, []);
    // ...
}

// RIGHT — Server Component passes data as props
// app/page.tsx (Server)
const appointments = await db.appointment.findMany(...);
return <AppointmentList appointments={appointments} />;

// components/AppointmentList.tsx (can be Server too, or Client if interactive)
```

---

## Route Handlers — for external consumers only

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';

export async function POST(request: Request) {
    const signature = request.headers.get('stripe-signature')!;
    const body = await request.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
        return new Response('Invalid signature', { status: 400 });
    }

    switch (event.type) {
        case 'invoice.paid':
            await handleInvoicePaid(event.data.object as Stripe.Invoice);
            break;
        case 'customer.subscription.deleted':
            await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
            break;
    }

    return new Response('OK');
}
```

Use Route Handlers for webhooks and external API consumers. Use Server Actions for mutations from your own UI.

---

## Metadata and SEO

```tsx
// app/appointments/[id]/page.tsx
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const appointment = await db.appointment.findUnique({ where: { id: params.id } });

    return {
        title: `Appointment with ${appointment?.doctor.name}`,
        description: `Scheduled for ${appointment?.date.toDateString()}`,
    };
}
```

---

## Loading and error states

```tsx
// app/appointments/loading.tsx — shown while page.tsx is loading
export default function Loading() {
    return <AppointmentListSkeleton />;
}

// app/appointments/error.tsx — caught by nearest error boundary
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div>
            <p>Something went wrong: {error.message}</p>
            <button onClick={reset}>Try again</button>
        </div>
    );
}
```

---

## ALWAYS
- Server Components by default — add `"use client"` only when needed
- Server Actions for all mutations from your UI
- Validate in Server Actions with Zod before touching the database
- `revalidatePath()` after mutations to refresh stale data
- `Suspense` boundaries with skeletons for streaming
- `generateMetadata()` for dynamic page titles

## NEVER
- `useEffect` to fetch data that could be fetched in a Server Component
- Route Handlers for mutations from your own frontend (use Server Actions)
- Client Components that re-fetch data they could receive as props
- `any` in TypeScript — define types for all Prisma responses and API payloads
- `process.env.*` in Client Components — use only in Server Components or Actions

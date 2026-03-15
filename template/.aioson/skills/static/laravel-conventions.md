# Laravel Conventions

> Production-grade Laravel. Thin controllers. Explicit intent. No shortcuts.

---

## Project structure

```
myproject/
├── app/
│   ├── Actions/              # Business logic — one class per operation
│   ├── Console/
│   │   └── Commands/
│   ├── Events/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/      # HTTP orchestration only
│   │   ├── Middleware/
│   │   └── Requests/         # Form Request classes (validation)
│   ├── Jobs/
│   ├── Listeners/
│   ├── Mail/
│   ├── Models/               # Eloquent models (singular class name)
│   ├── Notifications/
│   ├── Policies/
│   ├── Providers/
│   └── View/
│       └── Components/       # Blade components
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── resources/
│   ├── views/
│   │   ├── users/            # Plural folder per resource
│   │   │   ├── index.blade.php
│   │   │   ├── show.blade.php
│   │   │   ├── create.blade.php
│   │   │   └── edit.blade.php
│   │   ├── components/
│   │   └── layouts/
│   └── js/
├── routes/
│   ├── web.php
│   └── api.php
└── tests/
    ├── Feature/
    └── Unit/
```

**With Jetstream + Livewire** — additional folders:
```
app/
└── Livewire/
    ├── Auth/
    └── Users/                # Group components by domain
        ├── UserList.php
        └── EditUser.php
resources/views/
└── livewire/
    ├── auth/
    └── users/
        ├── user-list.blade.php   # kebab-case filename matches component
        └── edit-user.blade.php
```

---

## Naming conventions

| Artifact | Convention | Example |
|---|---|---|
| Model | Singular, PascalCase | `User`, `BlogPost` |
| Table | Plural, snake_case | `users`, `blog_posts` |
| Controller | Singular model + `Controller` | `UserController`, `BlogPostController` |
| Form Request | Action + model | `CreateUserRequest`, `UpdateUserRequest` |
| Action | Verb + noun + `Action` | `CreateUserAction`, `SendWelcomeEmailAction` |
| Policy | Singular model + `Policy` | `UserPolicy` |
| Event | Past-tense noun phrase | `UserCreated`, `OrderShipped` |
| Listener | Present verb phrase | `SendWelcomeEmail`, `NotifyAdminOfOrder` |
| Job | Imperative verb phrase | `GenerateInvoice`, `ProcessPayment` |
| API Resource | Singular model + `Resource` | `UserResource` |
| Livewire component class | PascalCase, singular or descriptive | `UserList`, `EditUser` |
| Livewire component file | kebab-case matching class | `user-list.blade.php` |
| View folder | Plural, kebab-case | `users/`, `blog-posts/` |
| Route URI | Plural, kebab-case | `/users`, `/blog-posts` |
| Migration | `create_table_table`, `add_col_to_table` | `create_users_table` |

**Singular vs plural rule of thumb:**
- Class names → **singular** (represents one record: `User`, `Order`)
- Folders grouping multiple files → **plural** (`Controllers/`, `Models/`, `views/users/`)
- Database tables and route URIs → **plural** (`users`, `/orders`)

---

## Controllers — HTTP orchestration only

Controllers validate the request, call an Action, and return a response. Nothing else.

```php
// WRONG — business logic in controller
public function store(Request $request)
{
    if (Appointment::where('doctor_id', $request->doctor_id)
        ->whereDate('date', $request->date)->exists()) {
        return back()->withErrors(['date' => 'Already booked.']);
    }
    $appointment = Appointment::create([...]);
    Mail::to(auth()->user())->send(new AppointmentConfirmed($appointment));
    return redirect()->route('appointments.index');
}

// RIGHT — controller as orchestrator
public function store(CreateAppointmentRequest $request): RedirectResponse
{
    $appointment = (new CreateAppointmentAction)->execute(
        auth()->user(),
        AppointmentData::fromRequest($request)
    );
    return redirect()->route('appointments.show', $appointment);
}
```

---

## Form Requests — all validation lives here

```php
class CreateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Appointment::class);
    }

    public function rules(): array
    {
        return [
            'doctor_id' => ['required', 'exists:doctors,id'],
            'date'      => ['required', 'date', 'after:today'],
            'notes'     => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.after' => 'The appointment must be scheduled for a future date.',
        ];
    }
}
```

---

## Actions — one class, one business operation

```php
// app/Actions/CreateAppointmentAction.php
class CreateAppointmentAction
{
    public function execute(User $user, AppointmentData $data): Appointment
    {
        $this->ensureNoConflict($data->doctorId, $data->date);

        $appointment = Appointment::create([
            'user_id'   => $user->id,
            'doctor_id' => $data->doctorId,
            'date'      => $data->date,
            'notes'     => $data->notes,
        ]);

        AppointmentCreated::dispatch($appointment);

        return $appointment;
    }

    private function ensureNoConflict(int $doctorId, Carbon $date): void
    {
        if (Appointment::where('doctor_id', $doctorId)
            ->whereDate('date', $date)
            ->where('status', '!=', 'cancelled')
            ->exists()) {
            throw new AppointmentConflictException();
        }
    }
}
```

---

## Policies — authorization layer, not inside Actions

```php
class AppointmentPolicy
{
    public function view(User $user, Appointment $appointment): bool
    {
        return $user->id === $appointment->user_id
            || $user->hasRole('admin');
    }

    public function cancel(User $user, Appointment $appointment): bool
    {
        return $this->view($user, $appointment)
            && $appointment->date->isAfter(now()->addHours(24));
    }
}
```

Call via `$this->authorize('cancel', $appointment)` in controllers or Form Requests.

---

## Events + Listeners — side effects always async/queued

Never call external services synchronously inside an Action.

```php
// Event — carries minimum required data
class AppointmentCreated
{
    use Dispatchable, SerializesModels;
    public function __construct(public readonly Appointment $appointment) {}
}

// Listener — always queued
class SendConfirmationEmail implements ShouldQueue
{
    public int $tries = 3;

    public function handle(AppointmentCreated $event): void
    {
        Mail::to($event->appointment->user)
            ->send(new AppointmentConfirmedMail($event->appointment));
    }
}
```

---

## Jobs — long-running or retriable work

```php
class GenerateInvoiceJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(private readonly Order $order) {}

    public function handle(InvoiceService $service): void
    {
        $service->generate($this->order);
    }

    public function failed(Throwable $e): void
    {
        Log::error('Invoice generation failed', [
            'order_id' => $this->order->id,
            'error'    => $e->getMessage(),
        ]);
    }
}
```

---

## API Resources — always transform, never expose raw models

```php
class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'     => $this->id,
            'date'   => $this->date->toIso8601String(),
            'status' => $this->status,
            'doctor' => new DoctorResource($this->whenLoaded('doctor')),
            'can'    => [
                'cancel' => $request->user()->can('cancel', $this->resource),
            ],
        ];
    }
}
```

---

## N+1 prevention

```php
// WRONG — N+1 (one query per row)
$appointments = Appointment::all();
foreach ($appointments as $a) { echo $a->doctor->name; }

// RIGHT — eager loading
$appointments = Appointment::with(['doctor.user', 'patient'])->paginate(20);

// Define reusable scope on the model
public function scopeWithRelations(Builder $query): Builder
{
    return $query->with(['doctor.user', 'patient']);
}
```

Use Laravel Debugbar or Telescope in dev to catch N+1 before production.

---

## Model conventions

```php
class Appointment extends Model
{
    protected $fillable = ['user_id', 'doctor_id', 'date', 'status', 'notes'];

    protected $casts = [
        'date'         => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('date', '>', now())->orderBy('date');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }
}
```

---

## Migrations

- One migration per schema change — never edit after deployment.
- Always add foreign key constraints.
- Name columns after the domain: `cancelled_at`, not `is_cancelled_timestamp`.
- Add indexes for columns used in WHERE clauses and ORDER BY.

```php
Schema::create('appointments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('doctor_id')->constrained()->restrictOnDelete();
    $table->dateTime('date');
    $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('pending');
    $table->text('notes')->nullable();
    $table->timestamp('cancelled_at')->nullable();
    $table->timestamps();

    $table->index(['doctor_id', 'date']); // for conflict checks
});
```

---

## Testing

```php
// Feature — test full HTTP layer
test('patient can book appointment', function () {
    $patient = User::factory()->create();
    $doctor  = Doctor::factory()->create();

    actingAs($patient)
        ->post(route('appointments.store'), [
            'doctor_id' => $doctor->id,
            'date'      => now()->addDay()->toDateTimeString(),
        ])
        ->assertRedirect();

    expect(Appointment::where('user_id', $patient->id)->exists())->toBeTrue();
});

// Unit — test Actions in isolation
test('CreateAppointmentAction throws on conflict', function () {
    $existing = Appointment::factory()->confirmed()->create();

    expect(fn () => (new CreateAppointmentAction)->execute(
        $existing->user,
        AppointmentData::from(['doctor_id' => $existing->doctor_id, 'date' => $existing->date])
    ))->toThrow(AppointmentConflictException::class);
});
```

---

## Livewire components (Jetstream stack)

Livewire replaces full-page controllers for interactive UI. Use it instead of writing separate Vue/React components when the project is on the Jetstream+Livewire stack.

```php
// app/Livewire/Users/UserList.php
namespace App\Livewire\Users;

use Livewire\Component;
use Livewire\WithPagination;
use Livewire\Attributes\Computed;

class UserList extends Component
{
    use WithPagination;

    public string $search = '';

    // Computed property — recalculates automatically when $search changes
    #[Computed]
    public function users(): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return User::query()
            ->when($this->search, fn ($q) => $q->where('name', 'like', "%{$this->search}%"))
            ->paginate(10);
    }

    public function render(): \Illuminate\View\View
    {
        return view('livewire.users.user-list');
    }
}
```

```blade
{{-- resources/views/livewire/users/user-list.blade.php --}}
<div>
    <input wire:model.live="search" type="text" placeholder="Search…" />

    @foreach ($this->users as $user)
        <div>{{ $user->name }}</div>
    @endforeach

    {{ $this->users->links() }}
</div>
```

**Livewire conventions:**
- Class in `app/Livewire/<Domain>/ClassName.php` (PascalCase)
- View in `resources/views/livewire/<domain>/class-name.blade.php` (kebab-case)
- Use `#[Computed]` for derived data — never store computed values in public properties
- Use `wire:model.live` for real-time search; `wire:model.lazy` for form inputs (debounce on blur)
- Keep business logic in Actions — Livewire component only wires input → Action → response
- Never query DB inside Blade template — use `#[Computed]` property

**Classic controller variant (same project, non-Livewire views):**
```php
// app/Http/Controllers/UserController.php
class UserController extends Controller
{
    public function index(Request $request): View
    {
        $users = User::query()
            ->when($request->search, fn ($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->paginate(10);

        return view('users.index', compact('users'));
    }
}
```

Both patterns coexist fine in a Jetstream project — Livewire for interactive pages, classic controllers for simple read-only or API routes.

---

## ALWAYS
- Form Requests for validation
- Actions for business logic
- Policies for authorization
- Events + queued Listeners for side effects
- API Resources for JSON responses
- Eager loading with `with()`
- Follow naming conventions: singular classes, plural tables and view folders

## NEVER
- Business logic in controllers
- `Mail::send()` synchronously in request cycle
- `Auth::user()` inside an Action (inject `User` instead)
- Raw `DB::table()` queries bypassing Eloquent in feature code
- Exposing Eloquent models directly in API responses
- Queries inside Blade or Livewire templates directly (use `#[Computed]` or pass via controller)

# TALL Stack Patterns

> Tailwind + Alpine.js + Livewire + Laravel. Full-stack PHP monolith done right.

---

## Architecture: what goes where

```
Livewire  → stateful server-side UI (forms, tables, modals, real-time updates)
Alpine.js → lightweight client interactivity (toggles, dropdowns, local UI state)
Tailwind  → all styling — never write custom CSS for layout or spacing
Blade     → templating, layouts, shared components
Flux UI   → pre-built component library — always check here first
```

**Rule:** If Alpine.js logic exceeds ~20 lines, move the state to Livewire.

---

## Livewire component structure

```php
// app/Livewire/Appointments/CreateForm.php
class CreateForm extends Component
{
    public int $doctorId = 0;
    public string $date = '';
    public string $notes = '';

    protected array $rules = [
        'doctorId' => 'required|exists:doctors,id',
        'date'     => 'required|date|after:today',
        'notes'    => 'nullable|string|max:500',
    ];

    // Real-time validation on field change
    public function updated(string $field): void
    {
        $this->validateOnly($field);
    }

    public function submit(): void
    {
        $this->validate();
        $appointment = (new CreateAppointmentAction)->execute(
            auth()->user(),
            AppointmentData::from($this->only(['doctorId', 'date', 'notes']))
        );
        $this->dispatch('appointment-created', id: $appointment->id);
        $this->reset(['doctorId', 'date', 'notes']);
        session()->flash('success', 'Appointment booked.');
    }

    public function render(): View
    {
        return view('livewire.appointments.create-form', [
            'doctors' => Doctor::orderBy('name')->get(),
        ]);
    }
}
```

---

## Livewire — inter-component events

```php
// Child dispatches
$this->dispatch('appointment-created', id: $appointment->id);

// Parent listens
#[On('appointment-created')]
public function refresh(): void
{
    $this->appointments = Appointment::withRelations()->latest()->paginate(20);
}

// Target a specific component
$this->dispatch('refresh')->to(AppointmentList::class);
```

---

## Livewire — lazy loading for expensive components

```html
<!-- Defer until visible in viewport -->
<livewire:dashboard-stats lazy />
```

```php
// Component shows skeleton while loading
public function placeholder(): View
{
    return view('livewire.placeholders.stats-skeleton');
}
```

---

## Alpine.js — keep it lightweight

Use Alpine for pure UI state that does not involve the server.

```html
<!-- Toggle visibility -->
<div x-data="{ open: false }" @click.outside="open = false">
    <button @click="open = !open">Options</button>
    <div x-show="open" x-transition>
        <a href="#">Edit</a>
        <a href="#">Delete</a>
    </div>
</div>

<!-- Confirm before destructive Livewire action -->
<button
    x-data
    @click="if (confirm('Delete this appointment?')) $wire.delete({{ $appointment->id }})"
    class="text-red-600 hover:underline"
>
    Delete
</button>

<!-- Copy to clipboard -->
<div x-data="{ copied: false }">
    <button @click="navigator.clipboard.writeText('{{ $link }}'); copied = true; setTimeout(() => copied = false, 2000)">
        <span x-text="copied ? 'Copied!' : 'Copy link'"></span>
    </button>
</div>
```

---

## Tailwind — design system discipline

Always use Tailwind's spacing scale. Never use arbitrary values for standard spacing.

```html
<!-- WRONG -->
<div class="p-[17px] mt-[22px] text-[15px]">

<!-- RIGHT -->
<div class="p-4 mt-6 text-sm">
```

Define tokens in `tailwind.config.js`:

```js
module.exports = {
    theme: {
        extend: {
            colors: {
                brand: { DEFAULT: '#4F46E5', dark: '#4338CA' },
            },
            spacing: {
                sidebar: '280px',
            },
        },
    },
}
```

---

## Flux UI — use before building custom

```html
<!-- Buttons -->
<flux:button variant="primary">Save</flux:button>
<flux:button variant="ghost" icon="trash">Delete</flux:button>
<flux:button variant="danger" wire:click="delete" wire:loading.attr="disabled">
    <wire:loading wire:target="delete">Deleting...</wire:loading>
    <wire:loading.remove wire:target="delete">Delete</wire:loading.remove>
</flux:button>

<!-- Form inputs -->
<flux:input wire:model.live="email" label="Email" type="email" />
<flux:textarea wire:model="notes" label="Notes" rows="4" />
<flux:select wire:model="doctorId" label="Doctor">
    <flux:select.option value="">Select a doctor</flux:select.option>
    @foreach ($doctors as $doctor)
        <flux:select.option value="{{ $doctor->id }}">{{ $doctor->name }}</flux:select.option>
    @endforeach
</flux:select>

<!-- Modal with confirmation -->
<flux:modal name="confirm-delete">
    <flux:heading>Delete appointment?</flux:heading>
    <flux:text>This action cannot be undone.</flux:text>
    <div class="flex gap-2 mt-4">
        <flux:button variant="danger" wire:click="delete">Delete</flux:button>
        <flux:modal.close>Cancel</flux:modal.close>
    </div>
</flux:modal>
<flux:modal.trigger name="confirm-delete">
    <flux:button variant="ghost" icon="trash">Delete</flux:button>
</flux:modal.trigger>

<!-- Table -->
<flux:table>
    <flux:columns>
        <flux:column>Patient</flux:column>
        <flux:column>Date</flux:column>
        <flux:column>Status</flux:column>
    </flux:columns>
    <flux:rows>
        @foreach ($appointments as $appointment)
            <flux:row>
                <flux:cell>{{ $appointment->patient->name }}</flux:cell>
                <flux:cell>{{ $appointment->date->format('M d, Y H:i') }}</flux:cell>
                <flux:cell><flux:badge>{{ $appointment->status }}</flux:badge></flux:cell>
            </flux:row>
        @endforeach
    </flux:rows>
</flux:table>
```

---

## Blade layout structure

```
resources/views/
  components/
    layouts/
      app.blade.php        ← authenticated shell (nav, sidebar)
      guest.blade.php      ← public shell (centered, minimal)
    ui/
      card.blade.php       ← reusable card wrapper
      empty-state.blade.php
      page-header.blade.php
  livewire/
    appointments/
      create-form.blade.php
      list.blade.php
    placeholders/
      stats-skeleton.blade.php
  pages/
    appointments/
      index.blade.php
      show.blade.php
```

---

## Performance

```php
// Always paginate Livewire lists — never ->get() on unbounded queries
public function render(): View
{
    return view('livewire.appointments.list', [
        'appointments' => Appointment::withRelations()
            ->when($this->search, fn ($q) =>
                $q->where('notes', 'like', "%{$this->search}%"))
            ->latest()
            ->paginate(20),
    ]);
}

// Cache reference data with computed properties
public function getDoctorsProperty(): Collection
{
    return Cache::remember('doctors.active', now()->addMinutes(5), fn () =>
        Doctor::active()->orderBy('name')->get()
    );
}
```

---

## ALWAYS
- `wire:model.live` for real-time field validation
- `$this->validateOnly($field)` in `updated()`
- `#[On('event')]` for component communication
- `paginate()` for all list queries
- Flux UI components before custom Blade components
- `x-transition` for smooth Alpine.js reveals

## NEVER
- Database queries in Blade templates
- Alpine.js managing server state or API calls
- `->get()` on unbounded Eloquent queries in Livewire
- Custom CSS when a Tailwind utility exists
- Unguarded public Livewire properties (validate everything)

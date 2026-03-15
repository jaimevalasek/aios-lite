# Flux UI Components

> Flux is the official Livewire component library. Use it before building anything custom.

---

## Component inventory

Flux ships these — always check before building a custom component:

```
Buttons    : flux:button, flux:button.group
Forms      : flux:input, flux:textarea, flux:select, flux:checkbox, flux:radio,
             flux:switch, flux:field, flux:label, flux:error, flux:description
Navigation : flux:navbar, flux:sidebar, flux:breadcrumbs, flux:tabs
Overlays   : flux:modal, flux:dropdown, flux:tooltip, flux:popover
Feedback   : flux:badge, flux:toast (via JS), flux:spinner
Layout     : flux:card, flux:separator, flux:table, flux:heading, flux:text
Media      : flux:avatar, flux:icon
```

---

## Buttons

```html
<!-- Variants -->
<flux:button variant="primary">Save</flux:button>
<flux:button variant="ghost">Cancel</flux:button>
<flux:button variant="danger">Delete</flux:button>
<flux:button variant="outline">Export</flux:button>

<!-- With icon -->
<flux:button icon="plus">New Appointment</flux:button>
<flux:button icon-trailing="chevron-down">Options</flux:button>

<!-- Sizes -->
<flux:button size="sm">Small</flux:button>
<flux:button size="lg">Large</flux:button>

<!-- Loading state with Livewire -->
<flux:button wire:click="save" wire:loading.attr="disabled">
    <flux:icon wire:loading name="arrow-path" class="animate-spin" />
    <span wire:loading.remove>Save</span>
    <span wire:loading>Saving...</span>
</flux:button>

<!-- Icon-only with tooltip -->
<flux:button icon="trash" variant="ghost" aria-label="Delete" />
```

---

## Form fields

```html
<!-- Standard input with label and error -->
<flux:field>
    <flux:label>Email address</flux:label>
    <flux:input wire:model.live="email" type="email" placeholder="you@example.com" />
    <flux:error name="email" />
</flux:field>

<!-- Textarea -->
<flux:field>
    <flux:label>Notes</flux:label>
    <flux:textarea wire:model="notes" rows="4" />
    <flux:description>Optional. Max 500 characters.</flux:description>
    <flux:error name="notes" />
</flux:field>

<!-- Select with search -->
<flux:field>
    <flux:label>Doctor</flux:label>
    <flux:select wire:model="doctorId" searchable placeholder="Select a doctor...">
        @foreach ($doctors as $doctor)
            <flux:select.option value="{{ $doctor->id }}">{{ $doctor->name }}</flux:select.option>
        @endforeach
    </flux:select>
    <flux:error name="doctorId" />
</flux:field>

<!-- Checkbox and radio -->
<flux:checkbox wire:model="agreedToTerms" label="I agree to the terms" />

<flux:radio.group wire:model="plan" label="Plan">
    <flux:radio value="free" label="Free" description="Up to 3 projects" />
    <flux:radio value="pro" label="Pro" description="Unlimited projects" />
</flux:radio.group>

<!-- Toggle switch -->
<flux:switch wire:model.live="notifications" label="Email notifications" />
```

---

## Modal

```html
<!-- Trigger -->
<flux:modal.trigger name="confirm-delete">
    <flux:button variant="danger" icon="trash">Delete</flux:button>
</flux:modal.trigger>

<!-- Modal definition (anywhere in the component) -->
<flux:modal name="confirm-delete" class="max-w-md">
    <div class="space-y-4">
        <flux:heading>Delete appointment?</flux:heading>
        <flux:text class="text-zinc-500">
            This action cannot be undone. The patient will be notified.
        </flux:text>
        <div class="flex gap-2 justify-end">
            <flux:modal.close>
                <flux:button variant="ghost">Cancel</flux:button>
            </flux:modal.close>
            <flux:button variant="danger" wire:click="delete" wire:loading.attr="disabled">
                Delete
            </flux:button>
        </div>
    </div>
</flux:modal>
```

Programmatic control from Livewire:
```php
$this->modal('confirm-delete')->show();
$this->modal('confirm-delete')->close();
```

---

## Dropdown menu

```html
<flux:dropdown>
    <flux:button icon-trailing="chevron-down">Actions</flux:button>

    <flux:menu>
        <flux:menu.item icon="eye" wire:click="view">View</flux:menu.item>
        <flux:menu.item icon="pencil" wire:click="edit">Edit</flux:menu.item>
        <flux:menu.separator />
        <flux:menu.item icon="trash" variant="danger" wire:click="delete">Delete</flux:menu.item>
    </flux:menu>
</flux:dropdown>
```

---

## Table

```html
<flux:table>
    <flux:columns>
        <flux:column sortable wire:click="sort('name')">Patient</flux:column>
        <flux:column sortable wire:click="sort('date')">Date</flux:column>
        <flux:column>Status</flux:column>
        <flux:column class="text-right">Actions</flux:column>
    </flux:columns>

    <flux:rows>
        @forelse ($appointments as $appointment)
            <flux:row :key="$appointment->id">
                <flux:cell class="font-medium">{{ $appointment->patient->name }}</flux:cell>
                <flux:cell>{{ $appointment->date->format('M d, Y H:i') }}</flux:cell>
                <flux:cell>
                    <flux:badge :color="$appointment->statusColor()">
                        {{ $appointment->status }}
                    </flux:badge>
                </flux:cell>
                <flux:cell class="text-right">
                    <flux:button size="sm" variant="ghost" wire:click="edit({{ $appointment->id }})">
                        Edit
                    </flux:button>
                </flux:cell>
            </flux:row>
        @empty
            <flux:row>
                <flux:cell colspan="4" class="text-center py-12 text-zinc-400">
                    No appointments found.
                </flux:cell>
            </flux:row>
        @endforelse
    </flux:rows>
</flux:table>
```

---

## Badges and status indicators

```html
<flux:badge color="green">Confirmed</flux:badge>
<flux:badge color="yellow">Pending</flux:badge>
<flux:badge color="red">Cancelled</flux:badge>
<flux:badge color="blue">Rescheduled</flux:badge>

<!-- Dynamic color from model method -->
<flux:badge :color="$appointment->statusColor()">{{ $appointment->status }}</flux:badge>
```

---

## Sidebar navigation

```html
<flux:sidebar>
    <flux:sidebar.toggle class="lg:hidden" icon="x-mark" />

    <a href="{{ route('home') }}" class="flex items-center gap-2 px-4 py-3">
        <flux:icon name="calendar" class="text-brand" />
        <span class="font-semibold">Clinic App</span>
    </a>

    <flux:navlist class="flex-1">
        <flux:navlist.item icon="home" href="{{ route('dashboard') }}" :current="request()->routeIs('dashboard')">
            Dashboard
        </flux:navlist.item>
        <flux:navlist.item icon="calendar" href="{{ route('appointments.index') }}" :current="request()->routeIs('appointments.*')">
            Appointments
        </flux:navlist.item>
        <flux:navlist.group heading="Admin" expandable>
            <flux:navlist.item icon="users" href="{{ route('doctors.index') }}">Doctors</flux:navlist.item>
            <flux:navlist.item icon="cog" href="{{ route('settings') }}">Settings</flux:navlist.item>
        </flux:navlist.group>
    </flux:navlist>

    <flux:navlist>
        <flux:navlist.item icon="arrow-right-start-on-rectangle" href="{{ route('logout') }}"
            onclick="event.preventDefault(); document.getElementById('logout-form').submit();">
            Sign out
        </flux:navlist.item>
    </flux:navlist>
</flux:sidebar>
```

---

## Customizing with Tailwind

Flux components accept standard Tailwind classes:

```html
<flux:card class="border-l-4 border-brand p-6">...</flux:card>
<flux:button class="w-full justify-center">Full width</flux:button>
<flux:input class="font-mono" />
```

Do not override Flux's internal variant styles — customize at the design token level via `tailwind.config.js`.

---

## ALWAYS
- Use `flux:field` wrapper for inputs (provides label + error layout)
- Use `flux:modal.trigger` + `flux:modal` pair for dialogs
- Use `wire:loading` states on async actions
- Use `flux:badge` for status labels with semantic colors
- Check Flux docs before building any custom component

## NEVER
- Duplicate a Flux component with a custom Blade component
- Mix Flux and other component libraries (shadcn, DaisyUI) in the same project
- Override Flux variant classes with arbitrary Tailwind — use config tokens

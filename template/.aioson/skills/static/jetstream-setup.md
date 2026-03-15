# Jetstream Setup

> Laravel Jetstream scaffolds authentication, teams, API tokens, and profile management. Decide at project creation.

---

## Decision: Inertia vs Blade

Make this choice before `artisan jetstream:install` — it cannot be changed without reinstalling.

| Factor | Blade + Livewire | Inertia + Vue/React |
|---|---|---|
| Team skillset | PHP-first | JS-first |
| SPA behavior needed? | No | Yes |
| Existing Livewire investment? | Yes → Blade | No |
| Complex client-side state? | No | Yes |
| SEO critical? | Both work | Both work (with SSR) |

---

## Installation

```bash
# Blade + Livewire (most common for TALL stack)
composer require laravel/jetstream
php artisan jetstream:install livewire --teams   # omit --teams if not needed
npm install && npm run build
php artisan migrate

# Inertia + Vue
php artisan jetstream:install inertia --teams
npm install && npm run build
php artisan migrate
```

---

## Teams — use only when multi-tenant is required

Teams give each user an isolated workspace. Enable only if your domain genuinely needs it.

```php
// Check if the current user belongs to a team
auth()->user()->currentTeam->name;

// Add a custom field to teams
// database/migrations/xxxx_add_plan_to_teams.php
Schema::table('teams', function (Blueprint $table) {
    $table->string('plan')->default('free');
    $table->integer('member_limit')->default(3);
});

// Team model customization
// app/Models/Team.php
class Team extends JetstreamTeam
{
    protected $fillable = ['name', 'personal_team', 'plan', 'member_limit'];

    public function hasAvailableSlots(): bool
    {
        return $this->users()->count() < $this->member_limit;
    }
}
```

---

## Roles and permissions (Teams)

```php
// Define in JetstreamServiceProvider
Jetstream::defaultApiTokenPermissions(['read']);

Jetstream::role('admin', 'Administrator', [
    'create', 'read', 'update', 'delete',
])->description('Administrators have full control.');

Jetstream::role('editor', 'Editor', [
    'create', 'read', 'update',
])->description('Editors can create and edit content.');

// Check in controllers
if (! $request->user()->hasTeamRole($team, 'admin')) {
    abort(403);
}

// Check in Policies
public function update(User $user, Post $post): bool
{
    return $user->hasTeamPermission($post->team, 'update');
}
```

---

## API tokens

```php
// Token creation is built-in via Jetstream UI
// Access in routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/api/appointments', [AppointmentController::class, 'index']);
});

// Check specific token permissions
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/api/appointments', [AppointmentController::class, 'store'])
        ->middleware('can:create,App\Models\Appointment');
});
```

---

## Profile customization

Add fields to the profile update form:

```php
// app/Actions/Fortify/UpdateUserProfileInformation.php
public function update(User $user, array $input): void
{
    Validator::make($input, [
        'name'  => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'unique:users,email,' . $user->id],
        'phone' => ['nullable', 'string', 'max:20'],  // custom field
    ])->validateWithBag('updateProfileInformation');

    if (isset($input['photo'])) {
        $user->updateProfilePhoto($input['photo']);
    }

    $user->forceFill([
        'name'  => $input['name'],
        'email' => $input['email'],
        'phone' => $input['phone'] ?? null,
    ])->save();
}
```

---

## Two-factor authentication

Jetstream includes 2FA via TOTP out of the box.

```php
// Require 2FA for admin routes
Route::middleware(['auth', 'verified', '2fa'])->group(function () {
    Route::get('/admin', AdminController::class);
});

// Force users to confirm password before sensitive actions
Route::middleware(['auth', 'password.confirm'])->group(function () {
    Route::delete('/account', [AccountController::class, 'destroy']);
});
```

---

## Middleware stack understanding

```php
// web.php — routes available to all
Route::middleware(['web'])->group(function () { ... });

// Authenticated routes
Route::middleware(['auth', 'verified'])->group(function () { ... });

// Team-scoped routes
Route::middleware(['auth', 'verified', EnsureUserHasTeam::class])->group(function () { ... });
```

---

## Custom views — override Jetstream defaults

```bash
php artisan vendor:publish --tag=jetstream-views
# Publishes to resources/views/vendor/jetstream/
```

Override only the views you need. Keep Jetstream's Action classes unless you need custom logic.

---

## Post-install checklist

- [ ] Choose Livewire or Inertia (cannot change later)
- [ ] Decide on Teams before first migration
- [ ] Configure `FILESYSTEM_DISK` for profile photos (`public` or `s3`)
- [ ] Set `MAIL_*` env vars — email verification requires working mail
- [ ] Update `JetstreamServiceProvider` with roles/permissions
- [ ] Customize `UpdateUserProfileInformation` if adding custom fields
- [ ] Override views for custom branding

## NEVER
- Install Jetstream into an existing project without checking for migration conflicts
- Enable Teams if the domain does not genuinely need multi-tenancy
- Modify Jetstream Action classes unless customization is explicitly required
- Mix Jetstream auth with another auth package (Breeze, Fortify standalone) in the same app

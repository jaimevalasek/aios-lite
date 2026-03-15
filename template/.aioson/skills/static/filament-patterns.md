# Filament Patterns

> Admin panels and back-office tools built with Filament v3. Panel as product, not afterthought.

---

## Resource structure — CRUD done right

```php
// app/Filament/Resources/AppointmentResource.php
class AppointmentResource extends Resource
{
    protected static ?string $model = Appointment::class;
    protected static ?string $navigationIcon = 'heroicon-o-calendar';
    protected static ?string $navigationGroup = 'Scheduling';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('doctor_id')
                ->relationship('doctor', 'name')
                ->searchable()
                ->preload()
                ->required(),

            Forms\Components\DateTimePicker::make('date')
                ->required()
                ->minDate(now())
                ->native(false),

            Forms\Components\Textarea::make('notes')
                ->rows(3)
                ->columnSpanFull(),

            Forms\Components\Select::make('status')
                ->options(AppointmentStatus::class)
                ->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('patient.name')
                    ->searchable()->sortable(),
                Tables\Columns\TextColumn::make('doctor.name')
                    ->searchable()->sortable(),
                Tables\Columns\TextColumn::make('date')
                    ->dateTime('M d, Y H:i')->sortable(),
                Tables\Columns\BadgeColumn::make('status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'confirmed',
                        'danger'  => 'cancelled',
                    ]),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options(AppointmentStatus::class),
                Tables\Filters\Filter::make('upcoming')
                    ->query(fn ($query) => $query->where('date', '>', now())),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('confirm')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === 'pending')
                    ->action(fn ($record) => (new ConfirmAppointmentAction)->execute($record))
                    ->requiresConfirmation(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }
}
```

---

## Custom Pages — beyond CRUD

```php
// app/Filament/Pages/Dashboard.php
class Dashboard extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
    protected static string $view = 'filament.pages.dashboard';

    public function getHeaderWidgetsColumns(): int|array
    {
        return ['md' => 2, 'xl' => 4];
    }

    protected function getHeaderWidgets(): array
    {
        return [
            AppointmentsToday::class,
            CancelledThisWeek::class,
            RevenueWidget::class,
            OccupancyRateWidget::class,
        ];
    }
}
```

---

## Widgets — stats and charts

```php
class AppointmentsToday extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Today\'s Appointments', Appointment::today()->count())
                ->description('+12% from yesterday')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('success'),

            Stat::make('Pending Confirmation', Appointment::pending()->count())
                ->color('warning'),

            Stat::make('Cancelled Today', Appointment::cancelledToday()->count())
                ->color('danger'),
        ];
    }
}
```

---

## Relation Managers

```php
// Manage related models from within a parent Resource
class PrescriptionsRelationManager extends RelationManager
{
    protected static string $relationship = 'prescriptions';

    public function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('medication')->required(),
            Forms\Components\TextInput::make('dosage')->required(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('medication'),
                Tables\Columns\TextColumn::make('dosage'),
                Tables\Columns\TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->headerActions([Tables\Actions\CreateAction::make()])
            ->actions([Tables\Actions\EditAction::make(), Tables\Actions\DeleteAction::make()]);
    }
}
```

---

## Policies — guard every Filament action

```php
// Filament automatically uses Laravel Policies
class AppointmentPolicy
{
    public function viewAny(User $user): bool  { return $user->hasRole('admin', 'staff'); }
    public function view(User $user, Appointment $a): bool { return $user->hasRole('admin', 'staff'); }
    public function create(User $user): bool   { return $user->hasRole('admin', 'staff'); }
    public function update(User $user, Appointment $a): bool { return $user->hasRole('admin'); }
    public function delete(User $user, Appointment $a): bool { return $user->hasRole('admin'); }
}
```

Register the policy and Filament will enforce it on all Resource actions automatically.

---

## Notifications

```php
// Inside an Action
Notification::make()
    ->title('Appointment confirmed')
    ->success()
    ->send();

// Persistent notification for a specific user
Notification::make()
    ->title('New appointment requires review')
    ->warning()
    ->sendToDatabase($admin);
```

---

## Forms — advanced field patterns

```php
// Conditional field visibility
Forms\Components\Toggle::make('is_recurring')
    ->live(),

Forms\Components\Select::make('recurrence_type')
    ->options(['daily' => 'Daily', 'weekly' => 'Weekly', 'monthly' => 'Monthly'])
    ->visible(fn (Get $get) => $get('is_recurring')),

// File upload with preview
Forms\Components\FileUpload::make('medical_report')
    ->disk('private')
    ->directory('reports')
    ->acceptedFileTypes(['application/pdf'])
    ->maxSize(10240),

// Repeater for structured data
Forms\Components\Repeater::make('symptoms')
    ->schema([
        Forms\Components\TextInput::make('name')->required(),
        Forms\Components\Select::make('severity')
            ->options(['mild', 'moderate', 'severe']),
    ])
    ->minItems(1)
    ->columnSpanFull(),
```

---

## Business logic — always in Actions, not in Filament

```php
// WRONG — logic inside Filament action
Tables\Actions\Action::make('confirm')
    ->action(function ($record) {
        $record->update(['status' => 'confirmed']);
        Mail::to($record->patient)->send(new ConfirmationMail($record));
    }),

// RIGHT — delegate to Action class
Tables\Actions\Action::make('confirm')
    ->action(fn ($record) => (new ConfirmAppointmentAction)->execute($record))
    ->requiresConfirmation(),
```

---

## ALWAYS
- Register Policies — Filament enforces them automatically
- Use `->relationship()` on Select for Eloquent relations
- Use `->searchable()` and `->preload()` on FK selects
- Use `->live()` on fields that control conditional visibility
- Delegate complex logic to Action classes
- Use Widgets for dashboard metrics

## NEVER
- Business logic inside Filament action closures
- Skip policy registration for admin panels
- Use `->get()` without limits in Resource queries (use Filament's built-in pagination)
- Build custom admin UIs when a Filament Resource covers the use case

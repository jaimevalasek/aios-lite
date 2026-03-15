# Rails Conventions

> Rails way, done intentionally. Convention over configuration — but know what the conventions are.

---

## Controllers — HTTP coordination only

```ruby
# WRONG — business logic in controller
class AppointmentsController < ApplicationController
  def create
    if Appointment.where(doctor_id: params[:doctor_id], date: params[:date]).exists?
      render json: { error: 'Already booked' }, status: :conflict and return
    end
    appointment = Appointment.create!(appointment_params)
    AppointmentMailer.confirmation(appointment).deliver_later
    render json: appointment, status: :created
  end
end

# RIGHT — controller as coordinator
class AppointmentsController < ApplicationController
  before_action :authenticate_user!

  def create
    result = CreateAppointmentService.call(
      user: current_user,
      params: appointment_params
    )
    if result.success?
      render json: AppointmentSerializer.new(result.appointment), status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  private

  def appointment_params
    params.require(:appointment).permit(:doctor_id, :date, :notes)
  end
end
```

---

## Service Objects — single responsibility

```ruby
# app/services/create_appointment_service.rb
class CreateAppointmentService
  Result = Data.define(:success?, :appointment, :errors)

  def self.call(user:, params:)
    new(user: user, params: params).call
  end

  def initialize(user:, params:)
    @user   = user
    @params = params
  end

  def call
    check_conflict!

    appointment = Appointment.create!(
      user:      @user,
      doctor_id: @params[:doctor_id],
      date:      @params[:date],
      notes:     @params[:notes]
    )

    AppointmentCreatedJob.perform_later(appointment.id)

    Result.new(success?: true, appointment: appointment, errors: [])
  rescue ActiveRecord::RecordInvalid => e
    Result.new(success?: false, appointment: nil, errors: e.record.errors.full_messages)
  rescue ConflictError => e
    Result.new(success?: false, appointment: nil, errors: [e.message])
  end

  private

  def check_conflict!
    conflict = Appointment
      .where(doctor_id: @params[:doctor_id])
      .where(date: @params[:date])
      .where.not(status: :cancelled)
      .exists?

    raise ConflictError, 'This time slot is already booked.' if conflict
  end
end
```

---

## Models — domain behavior, not business workflows

```ruby
# app/models/appointment.rb
class Appointment < ApplicationRecord
  belongs_to :user
  belongs_to :doctor

  # Validations belong in the model
  validates :date, presence: true
  validates :status, inclusion: { in: %w[pending confirmed cancelled] }
  validate :date_must_be_in_future, on: :create

  # Scopes for reusable query logic
  scope :upcoming,   -> { where('date > ?', Time.current).order(:date) }
  scope :pending,    -> { where(status: :pending) }
  scope :for_doctor, ->(doctor_id) { where(doctor_id: doctor_id) }

  # Enums for status fields
  enum :status, { pending: 'pending', confirmed: 'confirmed', cancelled: 'cancelled' }

  # Business state checks belong here
  def cancellable?
    pending? || confirmed?
  end

  def within_cancellation_window?
    date > 24.hours.from_now
  end

  private

  def date_must_be_in_future
    errors.add(:date, 'must be in the future') if date.present? && date <= Time.current
  end
end
```

---

## Active Record — query patterns

```ruby
# N+1 prevention — always eager load
# WRONG
@appointments = Appointment.all
@appointments.each { |a| puts a.doctor.name }  # N queries

# RIGHT
@appointments = Appointment.includes(:doctor, user: :profile).upcoming

# Efficient bulk operations
Appointment.where(status: :pending, date: ..Time.current).update_all(status: :cancelled)

# Pagination with Kaminari or Pagy
@appointments = Appointment.includes(:doctor).upcoming.page(params[:page]).per(20)

# Select only needed columns for lists
@doctors = Doctor.select(:id, :name, :specialty).order(:name)

# Avoid select * for large tables
Appointment.select(:id, :date, :status, :doctor_id).upcoming
```

---

## Jobs — async and retriable

```ruby
# app/jobs/appointment_created_job.rb
class AppointmentCreatedJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(appointment_id)
    appointment = Appointment.find(appointment_id)
    AppointmentMailer.confirmation(appointment).deliver_now
    SlackNotificationService.call(event: :appointment_created, resource: appointment)
  rescue ActiveRecord::RecordNotFound
    # Record deleted — no action needed, stop retrying
  end
end
```

---

## Mailers

```ruby
# app/mailers/appointment_mailer.rb
class AppointmentMailer < ApplicationMailer
  default from: 'noreply@clinic.com'

  def confirmation(appointment)
    @appointment = appointment
    @doctor      = appointment.doctor
    @patient     = appointment.user

    mail(
      to:      @patient.email,
      subject: "Appointment confirmed with #{@doctor.name}"
    )
  end
end

# Always use deliver_later — never deliver_now in request cycle
AppointmentMailer.confirmation(appointment).deliver_later
```

---

## Serializers (with ActiveModel::Serializer or JSONAPI)

```ruby
# app/serializers/appointment_serializer.rb
class AppointmentSerializer < ActiveModel::Serializer
  attributes :id, :date, :status, :notes

  belongs_to :doctor, serializer: DoctorSerializer
  belongs_to :user,   serializer: UserSerializer

  attribute :can_cancel do
    scope&.can?(:cancel, object)  # scope = current_user
  end

  attribute :formatted_date do
    object.date.strftime('%B %-d, %Y at %H:%M')
  end
end
```

---

## Authorization with Pundit

```ruby
# app/policies/appointment_policy.rb
class AppointmentPolicy < ApplicationPolicy
  def show?  = record.user == user || user.admin?
  def cancel? = show? && record.within_cancellation_window?
  def update? = user.admin?
  def destroy? = user.admin?
end

# In controller
def cancel
  @appointment = Appointment.find(params[:id])
  authorize @appointment, :cancel?
  # ...
end
```

---

## Testing with RSpec

```ruby
# spec/services/create_appointment_service_spec.rb
RSpec.describe CreateAppointmentService do
  subject(:service) { described_class.call(user: user, params: params) }

  let(:user)   { create(:user) }
  let(:doctor) { create(:doctor) }
  let(:params) { { doctor_id: doctor.id, date: 2.days.from_now } }

  it 'creates an appointment' do
    expect { service }.to change(Appointment, :count).by(1)
    expect(service).to be_success
  end

  it 'returns error when time slot is taken' do
    create(:appointment, doctor: doctor, date: params[:date])
    expect(service).not_to be_success
    expect(service.errors).to include('This time slot is already booked.')
  end

  it 'enqueues confirmation job' do
    expect { service }.to have_enqueued_job(AppointmentCreatedJob)
  end
end

# spec/requests/appointments_spec.rb
RSpec.describe 'POST /appointments', type: :request do
  let(:user) { create(:user) }
  before { sign_in user }

  it 'returns 201 on valid input' do
    post appointments_path, params: { appointment: { doctor_id: create(:doctor).id, date: 2.days.from_now } }
    expect(response).to have_http_status(:created)
  end
end
```

---

## ALWAYS
- Service objects for multi-step or conditional business workflows
- Enums for status/type columns (with string values for readability)
- Scopes for reusable query conditions
- `includes()` to prevent N+1 in list views
- `deliver_later` for all mailers
- Pundit policies for authorization

## NEVER
- Business logic in controllers
- Raw SQL for queries that Active Record can express
- `deliver_now` in the request cycle
- `update_attributes` (deprecated) — use `update`
- Callbacks for cross-model side effects (use services + jobs instead)

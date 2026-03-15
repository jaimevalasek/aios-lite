# Django Conventions

> Django's batteries are included for a reason. Use them — don't reinvent the ORM, admin, or auth system.

---

## Project structure

```
myproject/
├── manage.py
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   └── tests/
│   └── core/
│       └── models.py        # abstract base models (TimestampMixin, etc.)
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
└── templates/
```

**Convention:** keep apps small and domain-focused. One app = one bounded context.

---

## Models

```python
# core/models.py — reusable base
from django.db import models

class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# users/models.py
class UserProfile(TimestampMixin):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    bio = models.TextField(blank=True)

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f'Profile({self.user.email})'
```

**Rules:**
- Always define `__str__`
- Always set `db_table` in `Meta` (avoid auto-generated names)
- Use `TimestampMixin` for all models that need audit fields
- `blank=True` for optional string fields; `null=True` only for non-string nullable fields

---

## Views — use class-based views for CRUD, function-based for one-offs

```python
# WRONG — fat view with business logic
def create_order(request):
    if request.method == 'POST':
        # 30 lines of business logic here
        pass

# RIGHT — view delegates to service
from django.views import View
from .services import OrderService

class OrderCreateView(LoginRequiredMixin, View):
    def post(self, request):
        result = OrderService.create(user=request.user, data=request.POST)
        if result.ok:
            return redirect('orders:detail', pk=result.order.id)
        return render(request, 'orders/create.html', {'errors': result.errors})
```

**Rules:**
- Views handle HTTP only: parse request → call service → format response
- Business logic goes in `services.py`
- Always use `LoginRequiredMixin` for authenticated views
- Use `get_object_or_404` instead of manual `try/except`

---

## Services — business logic layer

```python
# orders/services.py
from dataclasses import dataclass
from typing import Optional
from .models import Order

@dataclass
class OrderResult:
    ok: bool
    order: Optional[Order] = None
    errors: Optional[dict] = None

class OrderService:
    @staticmethod
    def create(user, data) -> OrderResult:
        # validate
        if not data.get('items'):
            return OrderResult(ok=False, errors={'items': 'At least one item required'})

        # execute
        order = Order.objects.create(
            user=user,
            total=sum(item['price'] for item in data['items'])
        )
        return OrderResult(ok=True, order=order)
```

---

## Django REST Framework (DRF)

```python
# serializers.py
from rest_framework import serializers
from .models import Order

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'status', 'total', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_total(self, value):
        if value <= 0:
            raise serializers.ValidationError('Total must be positive')
        return value

# views.py (DRF)
from rest_framework import generics, permissions
from .serializers import OrderSerializer

class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related('user')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
```

**Rules:**
- Always define `read_only_fields` to prevent mass assignment
- Use `select_related` / `prefetch_related` in `get_queryset` to prevent N+1
- `perform_create` / `perform_update` for attaching request context (user, etc.)

---

## URL routing

```python
# apps/orders/urls.py
from django.urls import path
from . import views

app_name = 'orders'

urlpatterns = [
    path('', views.OrderListCreateView.as_view(), name='list'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='detail'),
]

# config/urls.py
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/orders/', include('apps.orders.urls')),
]
```

**Always use `app_name`** in each app's `urls.py` for namespaced reversals.

---

## Authentication

- **Built-in auth:** `django.contrib.auth` for session-based apps
- **JWT (API):** `djangorestframework-simplejwt`
- **Social auth:** `django-allauth`
- **Permission check:** always use `@login_required` / `LoginRequiredMixin` or DRF `permission_classes`

```python
# DRF JWT setup
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

---

## Database

```python
# Migrations — never edit after applied to production
python manage.py makemigrations
python manage.py migrate

# Always write reversible migrations (define both operations)
# Squash if > 50 unapplied migrations in dev

# Query optimization
# BAD — N+1
orders = Order.objects.all()
for o in orders:
    print(o.user.email)  # query per iteration

# GOOD
orders = Order.objects.select_related('user').all()

# Use .only() for large models when you need few fields
orders = Order.objects.only('id', 'status', 'total')
```

---

## Settings split

```python
# config/settings/base.py — shared
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'rest_framework',
    'apps.users',
    'apps.orders',
]

# config/settings/development.py
from .base import *
DEBUG = True
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}

# config/settings/production.py
from .base import *
DEBUG = False
DATABASES = {'default': dj_database_url.config(conn_max_age=600)}
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
```

**Never commit secrets.** Use `python-decouple` or `django-environ`.

---

## Admin

```python
# orders/admin.py
from django.contrib import admin
from .models import Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'status', 'total', 'created_at']
    list_filter = ['status']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
```

Always register models with `@admin.register` (not `admin.site.register`).

---

## Tests (pytest-django)

```python
# conftest.py
import pytest
from django.contrib.auth import get_user_model

@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        email='test@example.com', password='testpass123'
    )

@pytest.fixture
def api_client(user):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user)
    return client

# orders/tests/test_views.py
import pytest

@pytest.mark.django_db
def test_create_order_authenticated(api_client):
    response = api_client.post('/api/orders/', {'items': [{'price': 10}]})
    assert response.status_code == 201

@pytest.mark.django_db
def test_create_order_unauthenticated(client):
    response = client.post('/api/orders/', {})
    assert response.status_code == 401
```

**Use `pytest-django` over `unittest`** — fixtures are composable and tests are shorter.

---

## Hard rules

- Never put business logic in views, models, or serializers — use services
- Never use raw SQL unless `ORM` genuinely can't express it
- Always use `select_related`/`prefetch_related` for related objects in list views
- Always split settings by environment (base / dev / prod)
- Always use `get_object_or_404` in views — never `Model.objects.get()` bare

# Django Migration Guide - POS/Invoice System

This documentation provides a comprehensive guide for migrating from Supabase to Django.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Models](#2-models)
3. [Serializers](#3-serializers)
4. [Views](#4-views)
5. [URL Configuration](#5-url-configuration)
6. [Settings](#6-settings)
7. [React Frontend Migration](#7-react-frontend-migration)
8. [Migration Commands](#8-migration-commands)
9. [Data Migration Script](#9-data-migration-script)
10. [Environment Variables](#10-environment-variables)
11. [Supabase to Django Mapping](#11-supabase-to-django-mapping)

---

## 1. Project Setup

### Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Linux/Mac)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### Install Dependencies

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers psycopg2-binary python-dotenv django-filter
```

### Create Project Structure

```bash
# Create main project
django-admin startproject pos_backend
cd pos_backend

# Create apps
django-admin startapp invoices
django-admin startapp products
django-admin startapp accounts
```

### Project Structure

```
pos_backend/
├── pos_backend/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── accounts/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── products/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── invoices/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── scripts/
│   └── migrate_from_supabase.py
├── manage.py
├── requirements.txt
└── .env
```

---

## 2. Models

### accounts/models.py

```python
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    """
    Custom user model equivalent to Supabase auth.users
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email
```

### products/models.py

```python
from django.db import models
from django.conf import settings
import uuid


class Product(models.Model):
    """
    Product model - equivalent to Supabase products table
    
    Supabase columns mapped:
    - id: UUID primary key
    - user_id: Foreign key to user (for RLS)
    - name: Product name
    - price: Product price (numeric)
    - stock: Available stock (integer)
    - category: Product category
    - created_at: Timestamp
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='products',
        db_column='user_id'
    )
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock = models.IntegerField(default=0)
    category = models.CharField(max_length=100, default='Other')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def decrement_stock(self, quantity: int) -> bool:
        """
        Equivalent to Supabase decrement_stock function
        
        Args:
            quantity: Amount to decrement
            
        Returns:
            bool: True if successful, False if insufficient stock
        """
        if self.stock >= quantity:
            self.stock -= quantity
            self.save(update_fields=['stock'])
            return True
        return False

    def increment_stock(self, quantity: int) -> None:
        """Add stock to product"""
        self.stock += quantity
        self.save(update_fields=['stock'])
```

### invoices/models.py

```python
from django.db import models
from django.conf import settings
import uuid


class Invoice(models.Model):
    """
    Invoice model - equivalent to Supabase invoices table
    
    Supabase columns mapped:
    - id: UUID primary key
    - user_id: Foreign key to user (for RLS)
    - invoice_number: Unique invoice identifier
    - company_name: Company issuing invoice
    - company_address: Company address (nullable)
    - company_phone: Company phone (nullable)
    - customer_name: Customer name
    - issuer_name: Person who issued the invoice
    - products: JSONB array of products
    - subtotal: Subtotal before tax
    - tax: Tax amount
    - total: Final total
    - created_at: Timestamp
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices',
        db_column='user_id'
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    company_name = models.CharField(max_length=255)
    company_address = models.TextField(blank=True, null=True)
    company_phone = models.CharField(max_length=50, blank=True, null=True)
    customer_name = models.CharField(max_length=255)
    issuer_name = models.CharField(max_length=255)
    products = models.JSONField(default=list)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"

    def calculate_totals(self) -> None:
        """Recalculate invoice totals from products"""
        self.subtotal = sum(
            item.get('price', 0) * item.get('quantity', 0) 
            for item in self.products
        )
        self.tax = self.subtotal * 0.075  # 7.5% tax
        self.total = self.subtotal + self.tax
        self.save(update_fields=['subtotal', 'tax', 'total'])
```

---

## 3. Serializers

### accounts/serializers.py

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password": "Passwords don't match"
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data"""
    class Meta:
        model = User
        fields = ['id', 'email', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value
```

### products/serializers.py

```python
from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    """
    Product serializer
    
    Automatically assigns user_id from request context,
    equivalent to Supabase RLS behavior
    """
    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'stock', 'category', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        # Automatically set user from request (like Supabase auth.uid())
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ProductStockUpdateSerializer(serializers.Serializer):
    """Serializer for stock updates"""
    quantity = serializers.IntegerField(min_value=1)
```

### invoices/serializers.py

```python
from rest_framework import serializers
from .models import Invoice


class InvoiceProductSerializer(serializers.Serializer):
    """Serializer for products within an invoice"""
    id = serializers.UUIDField(required=False)
    name = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=1)


class InvoiceSerializer(serializers.ModelSerializer):
    """
    Invoice serializer
    
    Automatically assigns user_id from request context,
    equivalent to Supabase RLS behavior
    """
    products = InvoiceProductSerializer(many=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'company_name', 'company_address',
            'company_phone', 'customer_name', 'issuer_name', 'products',
            'subtotal', 'tax', 'total', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        # Automatically set user from request (like Supabase auth.uid())
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class InvoiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for invoice listings"""
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'customer_name', 
            'total', 'created_at'
        ]
```

---

## 4. Views

### accounts/views.py

```python
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer, 
    UserSerializer, 
    ChangePasswordSerializer
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint
    Equivalent to Supabase auth.signUp()
    """
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens (equivalent to Supabase session)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    """
    Get current authenticated user
    Equivalent to Supabase auth.getUser()
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    """
    Logout and blacklist refresh token
    Equivalent to Supabase auth.signOut()
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class ChangePasswordView(generics.UpdateAPIView):
    """Change user password"""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        
        return Response({'message': 'Password updated successfully'})
```

### products/views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Product
from .serializers import ProductSerializer, ProductStockUpdateSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """
    Product CRUD operations
    
    RLS Equivalent:
    - get_queryset filters by user (SELECT policy)
    - serializer.create sets user (INSERT policy)
    - ModelViewSet only allows owner access (UPDATE/DELETE policy)
    """
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    search_fields = ['name', 'category']
    ordering_fields = ['name', 'price', 'stock', 'created_at']
    filterset_fields = ['category']

    def get_queryset(self):
        """
        RLS equivalent: Users can only see their own products
        Equivalent to: auth.uid() = user_id
        """
        return Product.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def decrement_stock(self, request, pk=None):
        """
        Equivalent to Supabase decrement_stock function
        
        POST /api/products/{id}/decrement_stock/
        Body: { "quantity": 1 }
        """
        product = self.get_object()
        serializer = ProductStockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        quantity = serializer.validated_data['quantity']
        
        if product.decrement_stock(quantity):
            return Response({
                'success': True, 
                'new_stock': product.stock
            })
        return Response(
            {'error': 'Insufficient stock'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def increment_stock(self, request, pk=None):
        """Add stock to a product"""
        product = self.get_object()
        serializer = ProductStockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        quantity = serializer.validated_data['quantity']
        product.increment_stock(quantity)
        
        return Response({
            'success': True, 
            'new_stock': product.stock
        })

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get products with low stock (< 10)"""
        products = self.get_queryset().filter(stock__lt=10)
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get products grouped by category"""
        from django.db.models import Count, Sum
        
        categories = self.get_queryset().values('category').annotate(
            count=Count('id'),
            total_stock=Sum('stock')
        )
        return Response(list(categories))
```

### invoices/views.py

```python
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from .models import Invoice
from .serializers import InvoiceSerializer, InvoiceListSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Invoice CRUD operations
    
    RLS Equivalent:
    - get_queryset filters by user (SELECT policy)
    - serializer.create sets user (INSERT policy)
    - http_method_names excludes PUT/PATCH (no UPDATE policy in Supabase)
    - destroy only allows owner (DELETE policy)
    """
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend, 
        filters.SearchFilter, 
        filters.OrderingFilter
    ]
    search_fields = ['invoice_number', 'customer_name', 'issuer_name']
    ordering_fields = ['created_at', 'total']
    ordering = ['-created_at']

    # Note: No PUT/PATCH - matching Supabase RLS (no UPDATE policy)
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        """
        RLS equivalent: Users can only see their own invoices
        Includes date range filtering
        """
        queryset = Invoice.objects.filter(user=self.request.user)
        
        # Date range filtering (for History page)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
            
        return queryset

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get invoice statistics for dashboard
        Equivalent to Supabase aggregation queries
        """
        queryset = self.get_queryset()
        today = timezone.now().date()
        
        # Today's stats
        today_invoices = queryset.filter(created_at__date=today)
        today_total = today_invoices.aggregate(
            total=Sum('total'),
            count=Count('id')
        )
        
        # This month's stats
        month_start = today.replace(day=1)
        month_invoices = queryset.filter(created_at__date__gte=month_start)
        month_total = month_invoices.aggregate(
            total=Sum('total'),
            count=Count('id')
        )
        
        # Last 7 days daily breakdown
        week_ago = today - timedelta(days=7)
        daily_stats = []
        for i in range(7):
            day = week_ago + timedelta(days=i+1)
            day_data = queryset.filter(created_at__date=day).aggregate(
                total=Sum('total'),
                count=Count('id')
            )
            daily_stats.append({
                'date': day.isoformat(),
                'total': float(day_data['total'] or 0),
                'count': day_data['count']
            })
        
        return Response({
            'today': {
                'total': float(today_total['total'] or 0),
                'count': today_total['count']
            },
            'month': {
                'total': float(month_total['total'] or 0),
                'count': month_total['count']
            },
            'daily': daily_stats
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export invoices as CSV-ready data"""
        invoices = self.get_queryset()
        serializer = InvoiceListSerializer(invoices, many=True)
        return Response(serializer.data)
```

---

## 5. URL Configuration

### pos_backend/urls.py (Main URLs)

```python
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView, 
    TokenRefreshView
)

from products.views import ProductViewSet
from invoices.views import InvoiceViewSet
from accounts.views import (
    RegisterView, 
    CurrentUserView, 
    LogoutView,
    ChangePasswordView
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'invoices', InvoiceViewSet, basename='invoices')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API routes
    path('api/', include(router.urls)),
    
    # Auth routes (equivalent to Supabase Auth)
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/user/', CurrentUserView.as_view(), name='current_user'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
]
```

### API Endpoints Summary

| Supabase | Django | Method | Description |
|----------|--------|--------|-------------|
| `supabase.auth.signUp()` | `/api/auth/register/` | POST | Register user |
| `supabase.auth.signInWithPassword()` | `/api/auth/login/` | POST | Login |
| `supabase.auth.signOut()` | `/api/auth/logout/` | POST | Logout |
| `supabase.auth.getUser()` | `/api/auth/user/` | GET | Get current user |
| `supabase.from('products').select()` | `/api/products/` | GET | List products |
| `supabase.from('products').insert()` | `/api/products/` | POST | Create product |
| `supabase.from('products').update()` | `/api/products/{id}/` | PATCH | Update product |
| `supabase.from('products').delete()` | `/api/products/{id}/` | DELETE | Delete product |
| `supabase.rpc('decrement_stock')` | `/api/products/{id}/decrement_stock/` | POST | Decrement stock |
| `supabase.from('invoices').select()` | `/api/invoices/` | GET | List invoices |
| `supabase.from('invoices').insert()` | `/api/invoices/` | POST | Create invoice |
| `supabase.from('invoices').delete()` | `/api/invoices/{id}/` | DELETE | Delete invoice |

---

## 6. Settings

### pos_backend/settings.py

```python
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# Security
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    
    # Local apps
    'accounts',
    'products',
    'invoices',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # For static files
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'pos_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pos_backend.wsgi.application'

# Database - PostgreSQL (same as Supabase uses)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'pos_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Custom user model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings (equivalent to Supabase CORS)
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only in development
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',') if not DEBUG else []
CORS_ALLOW_CREDENTIALS = True

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# JWT settings (equivalent to Supabase JWT)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

---

## 7. React Frontend Migration

### src/lib/api.ts

Replace the Supabase client with this API client:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface TokenResponse {
  access: string;
  refresh: string;
}

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  company_name: string;
  company_address?: string;
  company_phone?: string;
  customer_name: string;
  issuer_name: string;
  products: Array<{
    id?: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth';
        throw new Error('Session expired');
      }
      throw new Error('Retry request');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || error.message || 'Request failed');
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...this.getHeaders(), ...options.headers },
      });
      return await this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof Error && error.message === 'Retry request' && retry) {
        return this.request(endpoint, options, false);
      }
      throw error;
    }
  }

  async refreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
        return true;
      }
    } catch {
      // Token refresh failed
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return false;
  }

  // ==================== AUTH ====================
  
  async login(email: string, password: string): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Invalid credentials');
    }
    
    const data: TokenResponse = await response.json();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  }

  async register(email: string, password: string): Promise<{ user: User; tokens: TokenResponse }> {
    const response = await fetch(`${API_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, password_confirm: password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.email?.[0] || error.password?.[0] || 'Registration failed');
    }
    
    const data = await response.json();
    localStorage.setItem('access_token', data.tokens.access);
    localStorage.setItem('refresh_token', data.tokens.refresh);
    return data;
  }

  async logout(): Promise<void> {
    const refresh = localStorage.getItem('refresh_token');
    try {
      await this.request('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh }),
      });
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async getUser(): Promise<User> {
    return this.request<User>('/auth/user/');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // ==================== PRODUCTS ====================

  async getProducts(): Promise<Product[]> {
    const response = await this.request<{ results: Product[] } | Product[]>('/products/');
    return Array.isArray(response) ? response : response.results;
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}/`);
  }

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    return this.request<Product>('/products/', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await this.request(`/products/${id}/`, { method: 'DELETE' });
  }

  async decrementStock(productId: string, quantity: number): Promise<{ success: boolean; new_stock: number }> {
    return this.request(`/products/${productId}/decrement_stock/`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  }

  async getLowStockProducts(): Promise<Product[]> {
    const response = await this.request<{ results: Product[] } | Product[]>('/products/low_stock/');
    return Array.isArray(response) ? response : response.results;
  }

  // ==================== INVOICES ====================

  async getInvoices(params?: { 
    search?: string; 
    date_from?: string; 
    date_to?: string; 
    ordering?: string;
  }): Promise<Invoice[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.ordering) query.append('ordering', params.ordering);
    
    const queryString = query.toString();
    const endpoint = `/invoices/${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<{ results: Invoice[] } | Invoice[]>(endpoint);
    return Array.isArray(response) ? response : response.results;
  }

  async getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/`);
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at'>): Promise<Invoice> {
    return this.request<Invoice>('/invoices/', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  async deleteInvoice(id: string): Promise<void> {
    await this.request(`/invoices/${id}/`, { method: 'DELETE' });
  }

  async getInvoiceStats(): Promise<{
    today: { total: number; count: number };
    month: { total: number; count: number };
    daily: Array<{ date: string; total: number; count: number }>;
  }> {
    return this.request('/invoices/stats/');
  }
}

export const api = new ApiClient();
```

### src/hooks/useAuth.tsx (Updated)

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    if (api.isAuthenticated()) {
      try {
        const userData = await api.getUser();
        setUser(userData);
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    await api.login(email, password);
    const userData = await api.getUser();
    setUser(userData);
  }

  async function signUp(email: string, password: string) {
    const { user: userData } = await api.register(email, password);
    setUser(userData);
  }

  async function signOut() {
    await api.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 8. Migration Commands

### Initial Setup

```bash
# Navigate to project
cd pos_backend

# Create migrations
python manage.py makemigrations accounts
python manage.py makemigrations products
python manage.py makemigrations invoices

# Apply migrations
python manage.py migrate

# Create superuser for admin access
python manage.py createsuperuser

# Collect static files (for production)
python manage.py collectstatic --noinput

# Run development server
python manage.py runserver
```

### Production Deployment

```bash
# Install production dependencies
pip install gunicorn whitenoise

# Run with gunicorn
gunicorn pos_backend.wsgi:application --bind 0.0.0.0:8000
```

---

## 9. Data Migration Script

### scripts/migrate_from_supabase.py

```python
#!/usr/bin/env python
"""
Data migration script from Supabase to Django
Run with: python manage.py shell < scripts/migrate_from_supabase.py
"""
import os
import sys
from datetime import datetime

# Add project to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pos_backend.settings')

import django
django.setup()

from supabase import create_client
from django.contrib.auth import get_user_model
from products.models import Product
from invoices.models import Invoice

User = get_user_model()

# Supabase connection
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY environment variables required")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def migrate_users():
    """
    Note: Supabase auth.users is not directly accessible via API.
    Users should re-register or use password reset flow.
    This creates placeholder users for data integrity.
    """
    print("Note: Users will need to re-register in Django.")
    print("Creating placeholder users for existing data...")
    
    # Get unique user_ids from products and invoices
    products = supabase.table('products').select('user_id').execute()
    invoices = supabase.table('invoices').select('user_id').execute()
    
    user_ids = set()
    for p in products.data:
        user_ids.add(p['user_id'])
    for i in invoices.data:
        user_ids.add(i['user_id'])
    
    for user_id in user_ids:
        User.objects.get_or_create(
            id=user_id,
            defaults={
                'username': f'user_{user_id[:8]}',
                'email': f'{user_id[:8]}@placeholder.com',
                'is_active': False  # Require password reset
            }
        )
    
    print(f"Created {len(user_ids)} placeholder users")


def migrate_products():
    """Migrate products from Supabase to Django"""
    print("\nMigrating products...")
    
    products = supabase.table('products').select('*').execute()
    
    created = 0
    updated = 0
    
    for p in products.data:
        obj, was_created = Product.objects.update_or_create(
            id=p['id'],
            defaults={
                'user_id': p['user_id'],
                'name': p['name'],
                'price': p['price'],
                'stock': p['stock'],
                'category': p.get('category', 'Other'),
            }
        )
        
        # Manually set created_at
        if p.get('created_at'):
            Product.objects.filter(id=p['id']).update(
                created_at=p['created_at']
            )
        
        if was_created:
            created += 1
        else:
            updated += 1
    
    print(f"Products: {created} created, {updated} updated")


def migrate_invoices():
    """Migrate invoices from Supabase to Django"""
    print("\nMigrating invoices...")
    
    invoices = supabase.table('invoices').select('*').execute()
    
    created = 0
    updated = 0
    
    for i in invoices.data:
        obj, was_created = Invoice.objects.update_or_create(
            id=i['id'],
            defaults={
                'user_id': i['user_id'],
                'invoice_number': i['invoice_number'],
                'company_name': i['company_name'],
                'company_address': i.get('company_address'),
                'company_phone': i.get('company_phone'),
                'customer_name': i['customer_name'],
                'issuer_name': i['issuer_name'],
                'products': i.get('products', []),
                'subtotal': i['subtotal'],
                'tax': i['tax'],
                'total': i['total'],
            }
        )
        
        # Manually set created_at
        if i.get('created_at'):
            Invoice.objects.filter(id=i['id']).update(
                created_at=i['created_at']
            )
        
        if was_created:
            created += 1
        else:
            updated += 1
    
    print(f"Invoices: {created} created, {updated} updated")


def verify_migration():
    """Verify migration was successful"""
    print("\n" + "="*50)
    print("MIGRATION SUMMARY")
    print("="*50)
    print(f"Users: {User.objects.count()}")
    print(f"Products: {Product.objects.count()}")
    print(f"Invoices: {Invoice.objects.count()}")
    print("="*50)


if __name__ == '__main__':
    print("Starting Supabase to Django migration...")
    print("="*50)
    
    try:
        migrate_users()
        migrate_products()
        migrate_invoices()
        verify_migration()
        print("\nMigration completed successfully!")
    except Exception as e:
        print(f"\nMigration failed: {e}")
        sys.exit(1)
```

---

## 10. Environment Variables

### .env

```env
# Django settings
SECRET_KEY=your-super-secret-key-generate-a-new-one
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL)
DB_NAME=pos_db
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_HOST=localhost
DB_PORT=5432

# CORS (for production)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Supabase (for migration only)
SUPABASE_URL=https://mnthrcvzeteftiagldbx.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

### .env.production

```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

DB_NAME=pos_production
DB_USER=postgres
DB_PASSWORD=your-production-password
DB_HOST=your-db-host
DB_PORT=5432

CORS_ORIGINS=https://yourdomain.com
```

---

## 11. Supabase to Django Mapping

### RLS Policies → Django Permissions

| Supabase RLS | Django Equivalent |
|--------------|-------------------|
| `auth.uid() = user_id` | `queryset.filter(user=request.user)` |
| `FOR SELECT USING (...)` | `get_queryset()` method |
| `FOR INSERT WITH CHECK (...)` | `serializer.create()` sets user |
| `FOR UPDATE USING (...)` | `ModelViewSet` restricts to owner |
| `FOR DELETE USING (...)` | `ModelViewSet` restricts to owner |

### Supabase Functions → Django Methods

| Supabase | Django |
|----------|--------|
| `supabase.rpc('decrement_stock', ...)` | `POST /api/products/{id}/decrement_stock/` |
| Trigger functions | Django signals or model methods |
| Edge functions | Django views or Celery tasks |

### Authentication Mapping

| Supabase Auth | Django JWT |
|---------------|------------|
| `auth.signUp()` | `POST /api/auth/register/` |
| `auth.signInWithPassword()` | `POST /api/auth/login/` |
| `auth.signOut()` | `POST /api/auth/logout/` |
| `auth.getUser()` | `GET /api/auth/user/` |
| `auth.getSession()` | Check `localStorage.access_token` |
| Access token | JWT access token |
| Refresh token | JWT refresh token |

---

## Requirements.txt

```
django>=4.2
djangorestframework>=3.14
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=23.5
psycopg2-binary>=2.9
python-dotenv>=1.0
gunicorn>=21.2
whitenoise>=6.6
supabase>=2.0  # Only for migration
```

---

## Docker Deployment (Optional)

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run migrations and start server
CMD python manage.py migrate && gunicorn pos_backend.wsgi:application --bind 0.0.0.0:8000
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: pos_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - DB_HOST=db
      - DB_NAME=pos_db
      - DB_USER=postgres
      - DB_PASSWORD=postgres
    depends_on:
      - db

volumes:
  postgres_data:
```

---

## Next Steps

1. **Set up PostgreSQL** locally or use a cloud provider
2. **Run migrations** to create database tables
3. **Migrate data** from Supabase using the migration script
4. **Update frontend** to use the new Django API client
5. **Test thoroughly** before switching production traffic
6. **Deploy Django** using Docker, Heroku, Railway, or your preferred platform

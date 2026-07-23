# KawaMyCenter Onboarding Flow

## Overview
The onboarding process guides new users through 4 steps to set up their account and tenant.

## Onboarding Steps

### STEP 1: Create Tenant
**Endpoint:** `POST /api/tenants`  
**Authentication:** Public (no auth required)  
**Purpose:** Create a new tenant with basic information

**Request Body:**
```json
{
  "tenantType": "FISICA",
  "fullName": "John Doe",
  "document": "11144477735",
  "street": "Rua Example",
  "number": "123",
  "district": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zipCode": "01310100",
  "email": "john@example.com",
  "mobilePhone": "11999999999"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "uuid-here",
    "onboardingStatus": "IN_PROGRESS",
    "onboardingStep": "STEP_1"
  }
}
```

**Next:** User receives temporary credentials to proceed to STEP 2

---

### STEP 2: Update User Credentials
**Endpoint:** `PATCH /api/onboarding/step-2`  
**Authentication:** Required (Bearer token)  
**Purpose:** Set user email and password, associate with tenant

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "tenantId": "tenant-uuid"
    },
    "onboardingStep": "STEP_2"
  }
}
```

**Next:** User proceeds to STEP 3 to select a plan

---

### STEP 3: Select Plan
**Endpoint:** `POST /api/onboarding/step-3`  
**Authentication:** Required (Bearer token)  
**Purpose:** User selects a subscription plan

**Get Available Plans:**
```
GET /api/onboarding/plans
```

**Select Plan:**
```json
{
  "planName": "FREE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": 1,
      "planName": "FREE",
      "maxUsers": 3,
      "maxNotes": 1000,
      "priceMonthly": 0
    },
    "onboardingStep": "STEP_3"
  }
}
```

**Next:** User completes onboarding in STEP 4

---

### STEP 4: Complete Onboarding
**Endpoint:** `POST /api/onboarding/complete`  
**Authentication:** Required (Bearer token)  
**Purpose:** Mark tenant as active and complete onboarding

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "tenantId": "tenant-uuid",
      "onboardingStatus": "COMPLETED",
      "onboardingStep": "STEP_4",
      "isActive": true
    }
  }
}
```

**Result:** User can now access the full application

---

## Validation Rules

### Sequential Completion
- Steps must be completed in order: STEP_1 → STEP_2 → STEP_3 → STEP_4
- Cannot skip steps
- Cannot go backwards

### Authorization
- STEP 1 is public (no authentication required)
- STEPS 2-4 require authentication
- User must belong to the tenant being updated

### Data Validation
- Document (CPF/CNPJ) must be valid
- Email must be unique
- Password must meet security requirements
- Plan must exist and be available

---

## Error Handling

### Common Errors

**Invalid Document:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Documento inválido para o tipo de tenant"
  }
}
```

**Duplicate Email:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_ENTRY",
    "message": "Email já cadastrado"
  }
}
```

**Out of Order:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STEP",
    "message": "Você deve completar o STEP_2 antes de prosseguir"
  }
}
```

---

## Testing the Flow

### Using cURL

```bash
# STEP 1: Create Tenant
curl -X POST http://localhost:3115/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantType": "FISICA",
    "fullName": "Test User",
    "document": "11144477735",
    "street": "Rua Test",
    "number": "123",
    "district": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310100",
    "email": "test@example.com"
  }'

# STEP 2: Update Credentials (use token from STEP 1)
curl -X PATCH http://localhost:3115/api/onboarding/step-2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# STEP 3: Get Plans
curl -X GET http://localhost:3115/api/onboarding/plans \
  -H "Authorization: Bearer <TOKEN>"

# STEP 3: Select Plan
curl -X POST http://localhost:3115/api/onboarding/step-3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"planName": "FREE"}'

# STEP 4: Complete Onboarding
curl -X POST http://localhost:3115/api/onboarding/complete \
  -H "Authorization: Bearer <TOKEN>"
```

---

## Database Schema

### Tenant Model
- `tenantId`: Unique identifier
- `onboardingStatus`: IN_PROGRESS | COMPLETED
- `onboardingStep`: STEP_1 | STEP_2 | STEP_3 | STEP_4
- `isActive`: Boolean (true after STEP_4)

### User Model
- `id`: Unique identifier
- `email`: Unique email
- `password`: Hashed password
- `tenantId`: Foreign key to Tenant
- `createdAt`: Timestamp

### TenantPlan Model
- `id`: Unique identifier
- `tenantId`: Foreign key to Tenant
- `planName`: Plan identifier (FREE, PRO, ENTERPRISE)
- `maxUsers`, `maxNotes`, etc.: Plan limits

---

## Security Considerations

1. **Email Verification:** Consider adding email verification before STEP 2
2. **Rate Limiting:** Implement rate limiting on tenant creation (STEP 1)
3. **Password Requirements:** Enforce strong password policy in STEP 2
4. **Audit Logging:** Log all onboarding steps for compliance
5. **Data Validation:** Validate all inputs server-side (never trust client)

---

## Future Enhancements

- [ ] Email verification step
- [ ] Phone verification (SMS)
- [ ] Payment processing integration
- [ ] Onboarding analytics
- [ ] Customizable onboarding flow
- [ ] Multi-language support

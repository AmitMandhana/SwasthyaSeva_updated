# Test Phone Number Registry

Reserved phone numbers for E2E testing. All start with `+91000` to avoid real numbers.

## Ephemeral Numbers (cleaned per test run)

| Phone | Purpose | Used By |
|-------|---------|---------|
| `+910000000000` | Booking lookup - not found (new patient) | clinic dashboard booking tests |
| `+910000011111` | Cross-app: full new patient journey | X1 full journey, X18 registration |
| `+910000022222` | Cross-app: return visit, same doctor multiple visits | X2 follow-up, X6 repeat visit |
| `+910000033333` | Cross-app: multi-doctor patient | X5 patient visiting 2 doctors |
| `+910000044444` | Cross-app: same phone at 2 clinics | X20 multi-clinic test |
| `+910000055555` | Clinic admin CRUD tests (admin phone) | X36 admin lifecycle |
| `+910000066666` | OTP error recovery tests | X38 wrong OTP, X39 max attempts, X40 resend |
| `+910000077777` | Booking full journey - register new patient | clinic dashboard booking OTP chain |
| `+910000088888` | Booking registration validation test | clinic BookAppointmentModal, X41-X42 |
| `+910000099999` | Legacy booking tests (deprecated) | old flows |
| `+910000012345` | Lead/inquiry flow patient | X24-X26 inquiry tests |
| `+910000054321` | Data isolation test - Patient B | X33 cross-patient isolation |

## Persistent Numbers (never deleted)

| Phone | Purpose | Used By |
|-------|---------|---------|
| `+919900000099` | Test patient account (persistent) | web/patient login, dashboard, profile |
| `+919800000001` | Test clinic entity (persistent) | clinic login |

## Legacy (cleanup only)

| Phone | Purpose |
|-------|---------|
| `+919999999999` | Legacy test number (deprecated) |

## Rules
- Numbers starting with `+91000` are ephemeral — created and deleted per test run
- Numbers starting with `+919` are persistent test accounts — never deleted
- All ephemeral numbers must be in the cleanup list at `backend/routes/testRoutes.js` → `cleanup-e2e-patients`
- Never use random phone numbers — always pick from this registry
- Each cross-app flow gets its own phone to avoid sibling data conflicts

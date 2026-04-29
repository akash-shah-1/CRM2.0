# Security Specification - Nexus Enterprise CRM

## Data Invariants
1. A user profile must be owned by the user whose UID matches the document ID.
2. The `role` field is immutable for the user themselves; only admins (or a predefined system process) can change roles.
3. Every user must have a valid email and display name.
4. Timestamps should be server-generated.

## The Dirty Dozen Payloads (Target: /users/{userId})

1. **Identity Spoofing**: User A tries to create a profile for User B.
2. **Privilege Escalation**: User A tries to create their own profile with `role: 'admin'`.
3. **Ghost Field Injection**: User A adds `isVerified: true` to their profile.
4. **ID Poisoning**: User tries to create a user with a document ID that is a 2KB junk string.
5. **PII Leak**: User A tries to 'get' User B's full profile (including email).
6. **Relational Break**: User tries to update a user profile that doesn't exist.
7. **Timestamp Fraud**: User provides a manual `createdAt` date from 2010.
8. **Role Hijacking**: Employee tries to update their own role to 'manager'.
9. **Email Spoofing**: User A tries to set their email to User B's email.
10. **Data Type Poisoning**: User sets `createdAt` to a string "now".
11. **Size Bomb**: User sends a `displayName` that is 1MB in size.
12. **Orphaned Write**: User deletes their own profile while still having active project assignments (logical invariant).

## Test Runner (firestore.rules.test.ts snippet)
- `assertFails(setDoc(doc(db, 'users', 'attacker'), { role: 'admin', ... }))`
- `assertFails(updateDoc(doc(db, 'users', 'victim'), { displayName: 'Hacked' }))`
- `assertFails(getDoc(doc(db, 'users', 'other_user')))` (If PII isolation is active)

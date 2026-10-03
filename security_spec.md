# Security Specification - Anivox Academy

## Data Invariants
1. **Identity Integrity**: Every student document must have a `uid` that matches `request.auth.uid`.
2. **Role Isolation**: Only documents in the `admins` collection (specifically the owner) can manage roles and global settings.
3. **Relational Security**: Access to paid course content (lessons) is gated by an `approved` enrollment record.
4. **Immutability**: `createdAt` and `studentId` fields are immutable after creation.
5. **PII Protection**: User profiles (especially phone numbers and ages) are only readable by the owner or admins.

## The Dirty Dozen (Payloads to Block)
1. **Privilege Escalation**: Student tries to set `role: 'admin'` during profile creation.
2. **Identity Spoofing**: User A tries to create a `Payment` with `studentId: UserB_UID`.
3. **Financial Fraud**: Student tries to update their own `Payment` status to `approved`.
4. **Data Scraping**: Authenticated student tries to list all `users`.
5. **Unauthorized Management**: Student tries to `create` or `delete` a `Course`.
6. **Notification Spam**: Student tries to create a `Notification` for another user.
7. **Resource Poisoning**: Student tries to submit a `Payment` with a 1MB UTR string.
8. **ID Injection**: Attacker tries to use a 2KB junk string as a `Course` ID.
9. **State Shortcut**: Student tries to create an `Enrollment` with `status: 'approved'`.
10. **PII Leak**: Student tries to `get` the profile of another student.
11. **Immutable Violation**: Student tries to update `createdAt` on their profile.
12. **System Bypass**: Student tries to write to the `admins` collection.

## Test Runner Logic
The `firestore.rules.test.ts` will verify that:
- Admin (anivoxacademy@gmail.com) has full access.
- Students are restricted to their own data.
- Writes are validated against schemas.
- Role/Status fields are protected.

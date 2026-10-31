# Wishlist

Features and ideas that need discussion, design, or are deferred for later.

---

## Similar Doctors on Profile Page
**Context**: Doctor profile page could show other doctors with the same specialty tags to help patients discover alternatives.
**Why deferred**: Doctors are primary clients — showing competitors on their profile without consent would upset them. Needs an opt-in mechanism.
**Requirements**:
- `show_similar_doctors` boolean on doctors table (default `false` — opt-in)
- Toggle in doctor profile settings to enable/disable
- New API endpoint to fetch same-tag doctors
- Doctor profile page checks flag before rendering section
**Effort**: Medium (schema migration + settings UI + API + frontend)

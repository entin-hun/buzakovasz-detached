# Architecture
- Keep password recovery on the public `/reset-password` page and suppress normal login redirects during recovery so email links can complete safely.
- Update volunteer profile details and deactivate cancelled commitments in the existing central tables; preserve rescue history and prior commitments.
- Use the existing volunteer profile panel for history, account details, and commitment management so changes reach the same public data source.
- Keep rescue-date exceptions in the shared calendar module and the matching database rescue_day function; both UI and server validation must use the same dates.
- Archive through the database archive_rescues function on a five-minute schedule with Budapest-local 20:00 gating and an advisory lock; this handles daylight-saving time and holiday shifts without duplicate history.
- Use the existing stores table for volunteer-managed recipient places; authenticated policies exclude bakery edits, and geocoding requires a validated session plus explicit address selection.
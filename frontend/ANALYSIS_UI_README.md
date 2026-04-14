# Analysis UI (Minimal)

This adds a simple, minimal UI for `/analysis/[input_id]` using the Next.js App Router.

## Folder Structure

```
app/
analysis/
[input_id]/
page.jsx

components/
analysis/
Summary.jsx
Skills.jsx
Suggestions.jsx
JobRoles.jsx
Score.jsx
```

## Fetch Logic

`app/analysis/[input_id]/page.jsx`:

- Reads `input_id` from the dynamic route params.
- Calls `API.get(\`/analysis/${input_id}\`)` using `frontend/utils/api.js`.
- Logs `response.data` to the console.
- Shows `Loading...` while fetching.
- Shows a simple error message if the request fails.
- Renders the UI if data is present.

## UI Rules

- White background, black text.
- Basic borders only.
- Simple layout with `border`, `p-4`, `mb-4`, `rounded`.
- No animations, no icons, no complex UI libraries.

## Components

- `Score.jsx`: Displays `Resume Score: {resume_score}`.
- `Summary.jsx`: Displays the summary paragraph.
- `Skills.jsx`: Shows matched and missing skills in `ul`/`li`.
- `JobRoles.jsx`: Lists job roles.
- `Suggestions.jsx`: Lists resume suggestions.

## Notes

Make sure the backend endpoint `GET /analysis/{input_id}` is accessible at
`http://localhost:8000` (configured in `utils/api.js`).

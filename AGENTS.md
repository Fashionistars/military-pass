<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## ❌ WRONG: Using `http://localhost:8000`

```
Error: Failed to fetch (/api/military/transfer-voice)
  at useMilitaryPassApi (file:///app/app/(military)/[...slug]/hooks.ts:163:20)
  at Array.map (<anonymous>)
  at MilitaryPassSection (file:///app/app/(military)/[...slug]/page.tsx:259:46)
```

## ✅ RIGHT: Using relative paths

```
Error: Failed to fetch (/api/military/transfer-voice)
  at useMilitaryPassApi (file:///app/app/(military)/[...slug]/hooks.ts:163:20)
  at Array.map (<anonymous>)
  at MilitaryPassSection (file:///app/app/(military)/[...slug]/page.tsx:259:46)
```

**When calling your FastAPI backend from Next.js, ALWAYS use relative paths.**

If your backend is running on port 8000 locally and deployed on HF Spaces at `/api/military`, the relative path `/api/military/transfer-voice` will automatically work in both environments.

**STRICTLY FORBIDDEN:** Using absolute URLs like `http://localhost:8000` or `http://<external-ip>` in your Next.js code.

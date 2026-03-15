---
id: error-pages
title: Error Pages
sidebar_position: 13
---

# Error Pages

Rackscope includes animated error pages for common HTTP errors.

## Available error pages

| URL | Code | Description |
|---|---|---|
| `/error/500` | Internal Server Error | Server crash — animated overheating rack |
| `/error/503` | Service Unavailable | Backend unreachable — disconnected cable animation |
| `/error/403` | Forbidden | Access denied — padlock slamming shut |
| `/error/401` | Unauthorized | Authentication required — same padlock, redirects to sign-in |

Each page includes:
- A themed animation matching the error type (rack/network/security metaphors)
- A clear error description
- **Go to Dashboard** and a context-appropriate secondary action (Reload / Go Back / Sign In)

## Error Boundary

If the React application crashes (unhandled JS error), an error boundary catches it and displays a `500`-style page with:
- The error message in monospace
- Reload and Go to Dashboard buttons

This prevents the browser from showing a blank white page.

## Simulate errors

You can navigate directly to any error page to test them:
- http://localhost:5173/error/500
- http://localhost:5173/error/503
- http://localhost:5173/error/403
- http://localhost:5173/error/401

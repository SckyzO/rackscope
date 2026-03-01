---
id: login
title: Authentication
sidebar_position: 9
---

# Authentication

Authentication in Rackscope is **optional** and disabled by default.

![Sign In page](/img/screenshots/signin.png)

## Default Behavior

Out of the box, Rackscope does not require any login. All routes — including the editors and Settings page — are accessible without credentials. This is intentional for lab environments, air-gapped deployments, and initial setup.

If you are running Rackscope on a private network with no external exposure, you may not need to enable authentication at all.

## Enabling Authentication

Authentication is controlled by the `auth` section in `config/app.yaml`:

```yaml
auth:
  enabled: true
  session_duration: 8h
  users:
    - username: admin
      # bcrypt hash of the password
      password_hash: "$2b$12$..."
```

You can also toggle authentication from the **Settings** page (`/settings`) → **Security** → **Require Authentication**. Saving the setting writes to `app.yaml` and reloads the backend automatically.

When `auth.enabled` is set to `true`:

- All API routes require a valid JWT token in the `Authorization: Bearer <token>` header.
- The frontend redirects unauthenticated requests to `/login`.
- The backend returns HTTP `401 Unauthorized` for requests without a valid token.

## Sign In Flow

1. Navigate to `/login` (or be redirected automatically if auth is enabled).
2. Enter your **username** and **password**.
3. Click **Sign In**.

On success, the backend issues a signed JWT token. The frontend stores it in `localStorage` under the key `rackscope.auth.token` and attaches it to every subsequent API request via the `Authorization` header.

You are then redirected to the page you were trying to access, or to the Dashboard if no redirect target was stored.

If the credentials are incorrect, a validation error appears inline — no page reload occurs.

## Sign Up

![Sign Up page](/img/screenshots/signup.png)

Self-registration is available when `auth.allow_signup` is enabled in `app.yaml`:

```yaml
auth:
  enabled: true
  allow_signup: false  # Set to true to enable self-registration
```

When enabled, a **Create account** link appears on the Sign In page. The Sign Up form collects a username and password. New accounts are stored in `app.yaml` as bcrypt-hashed entries and take effect immediately without a restart.

:::caution
Enable `allow_signup` only in controlled environments. Any user who can reach the Rackscope URL will be able to create an account.
:::

## Changing Your Password

1. Click your username in the top-right corner of the header.
2. Select **Profile**.
3. Enter your current password and then the new password twice.
4. Click **Save**.

The backend updates the bcrypt hash in `app.yaml` and invalidates all existing sessions for that user. You will be asked to sign in again.

## Session Management

Session lifetime is controlled by `auth.session_duration` in `app.yaml`. The value is a duration string such as `8h`, `24h`, or `7d`.

```yaml
auth:
  session_duration: 8h
```

When a session expires:

- The backend returns HTTP `401` on the next API call.
- The frontend detects the `401` response, clears `rackscope.auth.token` from `localStorage`, and redirects to `/login`.
- The user is shown a "Your session has expired" message on the login page.

There is no sliding expiry — the token expires at a fixed time from the moment it was issued.

## JWT Tokens

Rackscope uses stateless JWT (JSON Web Tokens) for session management:

- **Storage**: `localStorage` under the key `rackscope.auth.token`
- **Format**: Standard JWT with `sub` (username), `iat` (issued at), and `exp` (expires at) claims
- **Signing**: HMAC-SHA256, signed with the `auth.secret_key` value from `app.yaml`

:::warning
If you do not set `auth.secret_key` in `app.yaml`, Rackscope generates a random key at startup. This means all sessions are invalidated every time the backend restarts. For persistent sessions across restarts, set an explicit secret key:

```yaml
auth:
  secret_key: "change-this-to-a-long-random-string"
```
:::

Tokens are transmitted only in the `Authorization` header — they are never sent in cookies or query parameters.

## Security Notes

**Development vs. Production:**

- In development (local Docker stack), running without auth is acceptable and reduces friction.
- In production, enable auth and serve Rackscope over HTTPS.

**HTTPS:**

JWT tokens in `localStorage` are readable by any JavaScript running on the same origin. Always run Rackscope behind a TLS-terminating reverse proxy (nginx, Caddy, Traefik) in production. Do not expose the backend port (8000) or frontend port (5173) directly — use the reverse proxy.

**Principle of least exposure:**

Rackscope has no role-based access control in the current release. All authenticated users have the same permissions, including write access to editors and Settings. Restrict access at the network level (VPN, firewall) rather than relying solely on application-level auth.

## Forgot Password

There is no built-in password reset flow. To reset a user's password manually:

1. Generate a new bcrypt hash for the desired password:

```bash
python3 -c "import bcrypt; print(bcrypt.hashpw(b'yourpassword', bcrypt.gensalt()).decode())"
```

2. Open `config/app.yaml` and replace the `password_hash` value for the relevant user:

```yaml
auth:
  users:
    - username: admin
      password_hash: "$2b$12$<new-hash-here>"
```

3. Save the file. The backend reloads configuration automatically — no restart is needed.

The user can then sign in with the new password immediately.

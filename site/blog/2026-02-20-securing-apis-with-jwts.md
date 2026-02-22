---
title: Securing APIs with JWTs
description:
author: Mark Rudolph
published: 2026-02-20T14:55:00Z
lastUpdated: 2026-02-20T14:55:00Z
tags:
  - API
  - JWT
  - Security
  - Hookshot
  - PocketID
  - altx10
---

## Altx10

As mentioned in my [previous post](./2026-02-19-open-apps-with-pocket-id), I'm planning to roll out some demo web
applications leveraging a self-hosted "third party" Open ID Connect identity server (Pocket ID). I've set up a short url
to host these at: `altx10.dev`, with the idea being that each one will be deployed to `{app}.altx10.dev`. These
applications will be independent of each other, but with a centralized login. In order to secure parts of the apps, we
will use JSON Web Tokens.

## What is a JWT

A thorough discussion of what a JWT is can be found [here](https://www.jwt.io/introduction#what-is-json-web-token), but
as a brief summary, a JWT is a compact and self-contained way for securely transmitting information between parties as a
JSON object. It consists of a `header`, a `payload`, and a `signature`.

The contents of the header may represent something like:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

and the payload:

```json
{
  "sub": "1234567890",
  "name": "Tom Foolery",
  "admin": true
}
```

To build a JWT, we Base64 encode the header and payload separately, and then combine them separated by a period. The
following example would be `eyJhbGciIDogIkhTMjU2In0.eyJhYmMiIDogIjEyMyJ9`:

```shell
echo -n '{"alg" : "HS256"}' | base64 # eyJhbGciIDogIkhTMjU2In0
echo -n '{"abc" : "123"}' | base64  # eyJhYmMiIDogIjEyMyJ9
```

We then finally compute a signature of this data. The header portion specifies the algorithm we should use (here
`HMAC SHA 256`), we use a **private** passphrase to sign it (emphasis on *private* 🤫), and Base64 encode this.

Our example would look something like `kbCDwKHU1Sx1EzMCo8PXEnRERFvKQETu7Za0ELdSoyg`:

```shell
echo -n "eyJhbGciIDogIkhTMjU2In0.eyJhYmMiIDogIjEyMyJ9" | openssl dgst -sha256 -binary -hmac "SUPER_SECRET_PW" | base64 # kbCDwKHU1Sx1EzMCo8PXEnRERFvKQETu7Za0ELdSoyg
```

We add that signature to the previous part, separated by another period, and we have our JWT:
`eyJhbGciIDogIkhTMjU2In0.eyJhYmMiIDogIjEyMyJ9.kbCDwKHU1Sx1EzMCo8PXEnRERFvKQETu7Za0ELdSoyg`

If we pasted that in [jwt.io](https://jwt.io), and updated the JWT SIGNATURE VERIFICATION panel to use
`SUPER_SECRET_PW`, we could see the decoded portions as JSON, and that our signature was computed with the specified
algorithm and the same secure passphrase.

This is an excellent cookie to set from a web application!

- The JWT contains the algorithm used as part of the information that was signed.
- We can encode information in the payload (user ids, expiration times, scopes, etc.).
- The JWT is signed, so our app can verify it's something we generated and trust.

This cookie can be automatically sent on every request from a browser, so every request can have user-specific
authorization information that we can then handle on the backend.

## Where does Pocket ID fit in?

Authorization and identification are separate concerns. You might let a user "Sign in with GitHub", but you probably
don't want them to be able to access everything just because they have a GitHub account. We're using our JWTs for
authorization, and we are *identifying* users with Pocket ID as an OpenID Connect server. Our apps will say "I've
identified you via Pocket ID, and I will give you a JWT that authorizes you to use some restricted APIs."

In the `altx10.dev` domains, a code-flow login is made to the Pocket ID instance. If everything processes correctly,
then the final request will set a JWT cookie identifying who you are, and what permissions you have been allowed.

With our [hookshot](https://github.com/alterationx10/hookshot) library, the flow might look something like this, if we
tried to automatically log a user in to a protected route `/me`

```mermaid
sequenceDiagram
    participant User
    participant App as Cask App
    participant Hookshot as Hookshot Routes
    participant PocketID as Pocket ID (OIDC)
    User ->> App: GET /me (protected route)
    App ->> App: @autoAuthorize — no session cookie
    App -->> User: 302 Redirect to /login?redirectTo=/me
    User ->> Hookshot: GET /login?redirectTo=/me
    Hookshot ->> Hookshot: Sign state (encodes redirectTo)
    Hookshot -->> User: 302 Redirect to Pocket ID authorize URL
    User ->> PocketID: Authenticate with Pocket ID
    PocketID -->> User: 302 Redirect to /auth/callback?code=...&state=...&iss=...
    User ->> Hookshot: GET /auth/callback
    Hookshot ->> Hookshot: Validate signed state & issuer
    Hookshot ->> PocketID: Exchange code for tokens
    PocketID -->> Hookshot: Token response
    Hookshot ->> PocketID: GET /userinfo (access token)
    PocketID -->> Hookshot: User info
    Hookshot ->> Hookshot: Create JWT session cookie
    Hookshot -->> User: 302 Redirect to /me + Set-Cookie: session=<jwt>
    User ->> App: GET /me (with session cookie)
    App ->> App: @autoAuthorize — valid session
    App -->> User: 200 OK — Profile page
```

## JWTs vs Sessions

This might be a good time to note another method for dealing with users - a `user session`. There are
advantages/disadvantages to both, but in general a `session` is an identifier that links back to some state about a user
managed on the backend. This needs to be distributed, so all app instances have access to it - so probably stored in
something like redis. When we talk about JWTs, it is usually implied that some state has been embedded into the token
itself, and thus is `stateless` in the sense that it's not managed on the backend, but decoded as part of the request. A
JWT is valid as long as it hasn't expired, so revoking one becomes more complicated — typically requiring short-lived
tokens paired with a refresh token flow, or invalidating all user sessions — whereas with a session, you can simply
delete the state on the backend to invalidate a single user.

## Wrap Up

JWTs give us a lightweight, stateless mechanism for authorization — the server can verify a token without any external
lookups. Combined with an OIDC provider like Pocket ID, we get a clean separation of concerns: Pocket ID handles
*who you are*, and our apps handle *what you're allowed to do* by issuing their own signed JWT cookies on successful
authentication.

The hookshot library takes care of the heavy lifting in the OIDC flow — the redirect dance, state signing to prevent
CSRF, code exchange, and finally setting the session cookie. From there, each request to a protected route simply
decodes and validates the JWT, which is fast and requires no external calls.

As we build out apps on `altx10.dev`, this pattern will be the foundation for securing APIs and gating access to
restricted features. Stay tuned for posts covering specific apps built on top of this setup.
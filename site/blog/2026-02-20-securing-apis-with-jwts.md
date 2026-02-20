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
will use JSON Web Tokens

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

To build a JWT, we Base64 encode the header and payload separately, and then combined them separated with a period. The
following example would be `eyJhbGciIDogIkhTMjU2In0.eyJhYmMiIDogIjEyMyJ9`:

```shell
echo -n '{"alg" : "HS256"}' | base64 # eyJhbGciIDogIkhTMjU2In0
echo -n '{"abc" : "123"}' | base64  # eyJhYmMiIDogIjEyMyJ9
```

We then final compute a signature of this data. The header portion specifies the algorithm we should use (here
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
- We can encode information in the payload (user ids, expirations times, scopes, etc...).
- The JWT is signed, so our app can verify it's something we generated and trust.

This cookie can be automatically sent on every request from a browser, so every request can have user-specific
authorization information that we can then handle on the backend.

## Where does Pocket ID fit in?

## How JWTs are used in altx10.dev

## JWTs vs Sessions



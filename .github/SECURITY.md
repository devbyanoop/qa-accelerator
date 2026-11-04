# Security

This repository is a test framework, and the application it tests (Toolshop) is a public practice application
that runs in Docker on your own machine. It holds no real user data.

**Credentials.** The only credentials the tests use are Toolshop's published demo accounts. Keep them in
`.env.local`, which is git-ignored, or in your CI system's secrets. Never commit a real password or token.

**Reporting a problem.** If you find a leaked secret, an unsafe workflow step or a vulnerable dependency in
this repository, please open a private report through the repository's Security tab ("Report a vulnerability")
rather than a public issue. I will reply as soon as I can.

**Dependencies.** Dependabot proposes weekly updates for npm packages, GitHub Actions and the Dockerfile.

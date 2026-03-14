# semanticweb.dev Is Now Repo-Managed, Deployable, and Slightly Less Embarrassing

A lot of protocol work is glamorous in the wrong way.

Benchmarks are glamorous. New layers are glamorous. Compression charts are glamorous.

The less glamorous work is the part that makes a project believable.

So semanticweb.dev got some of that work this week.

The landing page is now repo-managed, deployable with a script, backed by explicit static assets, and shipped with the security and metadata basics that should have been there already.

Not a new layer. Not a new benchmark. Just less hand-wavy infrastructure.

## What changed

The homepage now has a real source of truth in the STP repo instead of living as an orphaned HTML file on the server.

That includes:

- `index.html` in the repo
- explicit static assets (`robots.txt`, `sitemap.xml`, `og-stp.svg`)
- a deploy script for pushing the landing page to production
- nginx-level security headers
- canonical and social metadata
- the homepage STP block itself

This is boring work. That is exactly why it matters.

## Why repo-managed matters

A protocol project should not have mystery production state.

If the public homepage changes, those changes should exist in version control. They should have a commit hash, a diff, and a rollback path. They should not depend on remembering which server file got edited at 1:14am.

Before this cleanup, semanticweb.dev had some of that “prototype energy.” It worked, but it was too easy for the live site to drift away from the repo.

Now the landing page has a proper source of truth:

[github.com/edison-commits/stp-protocol](https://github.com/edison-commits/stp-protocol)

That seems obvious. It is. But “obvious” and “done” are very different categories.

## Why the deploy script matters

A site that can only be updated by remembering the right SCP command is not a deployment story. It's a ritual.

The landing page now ships with a small deploy script that does the useful boring things:

- verifies the expected files exist
- backs up the current live landing page
- copies the updated assets to the server
- fixes file permissions
- restarts the nginx container

That is not sophisticated infrastructure. Good. It does not need to be.

The job of the deployment path is not to impress anyone. The job is to reduce the chance of stupid mistakes.

## Security headers are not optional decoration

If STP is going to make claims about structured, machine-readable, eventually action-capable web interfaces, the protocol's own public site should not be sloppy about basic web hardening.

semanticweb.dev now ships with explicit headers for:

- Content-Security-Policy
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

None of those make the protocol true.

They do make the project feel more serious, which matters because credibility in early-stage standards is partly technical and partly behavioral. People watch how you ship, not just what you claim.

## Metadata is part of the product surface

The site also now has the metadata basics that were missing or incomplete:

- canonical URL
- Twitter/X card metadata
- Open Graph image
- JSON-LD
- `robots.txt`
- `sitemap.xml`

This stuff gets dismissed as SEO garnish. That's lazy.

Metadata is part of how a technical project appears in the world. It's how links render, how pages get indexed, how context survives outside the page itself, and how machine consumers interpret what they found.

A protocol arguing for machine-readable meaning should not neglect machine-readable context around its own homepage.

## Why this is post-worthy at all

Because projects don't usually fail only on the big ideas. They fail in the gap between the big ideas and the boring operational reality.

The STP story so far has included the interesting pieces:

- conflict resolution
- security model
- action layer
- agent-to-agent protocol
- benchmarks
- generator
- validator
- temporal graph
- working paper

Those are the parts people like to talk about.

But if the project homepage is drifting out of version control, if deploys are manual folklore, and if the public site skips basic hardening, the whole thing feels more speculative than it should.

This cleanup closes part of that gap.

## The real milestone

The real milestone here is not "we added headers" or "we committed an HTML file."

It's this:

**semanticweb.dev now behaves more like a project that expects to still matter in a year.**

That's a better standard than novelty.

Live site: [semanticweb.dev](https://semanticweb.dev)

Repo: [github.com/edison-commits/stp-protocol](https://github.com/edison-commits/stp-protocol)

Small operational improvements do not sound impressive. They just quietly make everything else more believable.

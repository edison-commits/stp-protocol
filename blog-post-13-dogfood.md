# semanticweb.dev Now Ships Its Own STP Block

A protocol site describing machine-readable semantics should probably be machine-readable itself.

So now it is.

The semanticweb.dev homepage now ships an actual `<script type="application/stp+json">` block in production, alongside the usual human-facing HTML. Same URL, two audiences: humans read the landing page, agents can read the semantic layer directly.

That sounds cosmetic. It isn't.

## Why this matters

A new protocol only becomes real when it starts constraining its own publisher.

Before this change, semanticweb.dev was making the argument for STP while still behaving like every other landing page on the web: title tags, Open Graph, styled HTML, and a human-readable explanation of what the protocol *would* do.

Now the homepage is also an example of what the protocol *does* do.

The page includes:

- a production `application/stp+json` block
- canonical URL metadata
- JSON-LD for conventional crawlers
- robots.txt and sitemap.xml for discoverability
- an explicit Open Graph image for sharing
- hardened security headers at the nginx layer

The important one is the STP block.

## What's in the block

The homepage block declares the core protocol concepts and their relations:

- `semantic_transfer_protocol`
- `machine_readable_web`
- `ai_agent`
- `structured_semantic_reading`
- `structured_action_layer`
- `agent_to_agent_protocol`
- `token_and_latency_benchmark`

And the relations between them:

- STP **defines** a machine-readable web layer
- STP **enables** AI agents
- the reading layer **precedes** the action layer
- the action layer **precedes** agent-to-agent communication
- the benchmark claims are explicitly attached as supporting resources

It's not a giant block. That's deliberate.

The point of the homepage block is not to encode the entire protocol spec. The point is to make the page semantically legible in the same format the protocol asks publishers to adopt.

## Why dogfooding matters for standards

If STP requires special infrastructure, publishers won't adopt it.

If STP requires heroic manual authoring, publishers won't adopt it.

And if the protocol's own homepage doesn't use it, nobody should believe the adoption story.

The landing page now demonstrates the exact claim STP has made from the start:

**same URL, two audiences, no new infrastructure.**

It's still a static page served by nginx. Browsers ignore the STP block. Agents don't have to.

## The less glamorous fixes matter too

This update also fixed a few boring but necessary things:

- the landing page is now repo-managed instead of living only as server-side HTML
- deploys are scripted
- the site has a real sitemap
- the Open Graph image is explicit instead of implied
- security headers are part of the deployed config instead of wishful thinking

None of that is philosophically interesting. All of it makes the project more credible.

## Why this is a useful milestone

A lot of STP work so far has been prototypes, benchmarks, and specification work.

This change is smaller, but cleaner: the public homepage now participates in the protocol it is advocating.

That matters because standards are partly technical and partly social. People need to see the thing used in ordinary conditions, not just in demos.

semanticweb.dev now does that.

## Read it like an agent

Humans: [semanticweb.dev](https://semanticweb.dev)

Machines: same URL.

Repo: [github.com/edison-commits/stp-protocol](https://github.com/edison-commits/stp-protocol)

The protocol gets more believable every time one less page needs the sentence “imagine if this used STP” and instead just uses STP.

# Agent Instructions — GCP Operations

Scope: operating the LeetBattle GCP deployment (Cloud Run, Cloud SQL, Secret Manager).
Does not cover application code changes — see normal repo conventions for that.

## Tier 1: Never run, even if the user asks for it

**General rule:** if an action is irreversible, destroys data, or could take the
app down or inaccessible for everyone (not just the person asking), it belongs
here — regardless of whether it happens to be listed below. When in doubt, treat
it as Tier 1 and tell the user to run it themselves.

Examples: deleting the Cloud SQL instance, deleting a Cloud Run service, deleting
the Artifact Registry repo or an image in it, deleting a secret, changing or
revoking another member's IAM access, resizing the Cloud SQL tier, dropping/
truncating tables or bulk-deleting rows in the real database, deleting the GCP
project, any command using `--force`/`--quiet`/`-y` to bypass gcloud's own
confirmation prompts, `git push --force` to a shared branch.

## Tier 2: Routine, but requires explicit approval first

**General rule:** if an action changes what's currently running, costs money,
or touches credentials/access, it needs the exact command stated up front and
explicit yes from the user before it runs — even if it's not listed below.
Never chain a second Tier 2 action on implied approval from the first.

Examples: deploying a service, pausing/resuming Cloud SQL, creating a secret or
a new version of one, granting IAM access to a new developer being onboarded,
installing new local tooling.

## Tier 3: Free to run without asking

**General rule:** if an action only reads or observes existing state and cannot
change or break anything, it's fine to run without asking — even if it's not
listed below.

Examples: `describe`/`list`/`logging read`, checking service URLs or instance
state, `git status`/`log`/`diff`/`fetch`.

## Reference

- Project: `leetbattle-512901`
- Cloud Run region: `us-central1` — services: `auth-service`, `code-service`, `frontend`
- Cloud SQL instance: `leetbattle-db`, region `us-east1`, connection name
  `leetbattle-512901:us-east1:leetbattle-db`
- Secrets: `DB_Password`, `DB_Conn_Name` (case-sensitive; granted to
  `1040040326387-compute@developer.gserviceaccount.com` via `secretmanager.secretAccessor`)
- Artifact Registry: `us-central1-docker.pkg.dev/leetbattle-512901/leetbattle/<service>`

Known gotchas (do not re-discover these the hard way):
- `code-service` requires `--add-cloudsql-instances` and `--set-secrets` on *every*
  deploy, not just the first — omitting them drops that config from the new revision.
- Frontend `NEXT_PUBLIC_*` values must be passed as `docker build --build-arg`, not
  `gcloud run deploy --set-env-vars` — Next.js bakes them in at build time.
- Cloud Run services must listen on `process.env.PORT`, not a hardcoded port.
- IAM/secret grants can take a few minutes to propagate; a `PERMISSION_DENIED`
  immediately after granting access is not necessarily a real failure — wait and retry
  once before treating it as broken.

## Task: Onboard a new developer

1. Ask for their Google account email.
2. Tell them you cannot grant GCP access yourself — give them this command to send to
   an existing project owner (or run themselves if they already have access):
   `gcloud projects add-iam-policy-binding leetbattle-512901 --member="user:<email>" --role="roles/owner"`
   This is the one IAM grant allowed under Tier 2 — it only applies to onboarding a
   new member, never to changing an existing member's access.
3. Once they confirm access is granted, walk them through:
   `gcloud auth login`, `gcloud config set project leetbattle-512901`,
   `gcloud auth application-default login`
4. Confirm local tooling: `brew install libpq cloud-sql-proxy` (macOS).
5. `npm run install` at the repo root, then `npm run start` to confirm local dev works.

## Task: Deploy a service

1. Confirm which service(s) changed (ask if unclear).
2. For `auth-service`/`code-service`: build via `gcloud builds submit`, then
   `gcloud run deploy` with the full flag set for that service (see Reference).
3. For `frontend`: fetch current `auth-service`/`code-service` URLs, `docker build
   --platform linux/amd64` with `--build-arg` for both `NEXT_PUBLIC_*` values, push,
   then `gcloud run deploy`.
4. Report the deploy result and any error output verbatim back to the user — do not
   paraphrase an error away or silently retry.

## Task: Pause / resume Cloud SQL

- Pause: `gcloud sql instances patch leetbattle-db --activation-policy=NEVER`
- Resume: `gcloud sql instances patch leetbattle-db --activation-policy=ALWAYS`
- Note when pausing: `code-service` will fail requests until resumed — mention this
  before executing, since it affects anyone else using the deployed app, not just
  the person asking.

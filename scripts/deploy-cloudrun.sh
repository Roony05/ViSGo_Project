#!/usr/bin/env bash
#
# Deploy ViS-Go (SPA + API) to Google Cloud Run.
#
# Built with Docker on THIS machine and pushed straight to Artifact Registry,
# rather than `gcloud run deploy --source .`. That flag is convenient but it
# quietly drags in Cloud Build plus a Cloud Storage staging bucket; both have a
# free tier, and both are one more service appearing on a bill we are trying to
# keep at exactly zero. See CLOUDRUN_ZERO_COST.md §2.6.
#
#   GEMINI_API_KEY=... MAPILLARY_TOKEN=... npm run deploy:api
#
set -euo pipefail

PROJECT="${PROJECT:-visgo-project}"
REPO="${REPO:-visgo}"
SERVICE="${SERVICE:-visgo-api}"

# asia-southeast3 (Bangkok) is the Tier 1 region nearest Vietnam. Tier 1 matters
# because Cloud Run's free tier is granted as a spend-based discount priced at
# Tier 1 rates, so the same usage burns through it ~35% faster in a Tier 2
# region such as asia-southeast1 (Singapore). Singapore still works; it is the
# fallback, not the mistake.
REGION="${REGION:-asia-southeast3}"
if ! gcloud run regions list --format='value(locationId)' 2>/dev/null | grep -qx "${REGION}"; then
  echo "⚠  ${REGION} không khả dụng cho tài khoản này — lùi về asia-southeast1"
  REGION="asia-southeast1"
fi

# A repo with no commits yet has no HEAD to name, and `set -e` would abort here
# rather than deploy. The timestamp is a worse tag but a working one.
TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/${SERVICE}:${TAG}"

: "${GEMINI_API_KEY:?Đặt GEMINI_API_KEY trước khi chạy}"
: "${MAPILLARY_TOKEN:?Đặt MAPILLARY_TOKEN trước khi chạy}"
[ -f .env ] || { echo "✖ Thiếu .env — Vite cần các biến VITE_* lúc build"; exit 1; }

echo "▶ region ${REGION}"
echo "▶ build  ${IMAGE}"
docker build -t "${IMAGE}" .

# ── Guard 1: the image must contain the frontend ─────────────────────────────
#
# This is an all-in-one deployment. An image without dist/ still starts, still
# answers /api, and still returns 200 on a health check — it just serves
# {"error":"This deployment serves /api only."} at the root. A judge opening the
# submitted link sees JSON, and the ten deployment points are gone with nothing
# in any log to say why.
if ! docker run --rm --entrypoint sh "${IMAGE}" -c 'test -f dist/index.html'; then
  echo "✖ DỪNG: image thiếu dist/. Kiểm tra .dockerignore — xem PLAN_CODEX.md §P0.2" >&2
  exit 1
fi

# ── Guard 2: the Gemini key must not be in the bundle ────────────────────────
#
# .env enters the build stage, so this is where we prove it went no further.
# Gemini keys issued through Firebase/AI Studio start "AQ.Ab"; the Firebase web
# API key (AIza...) is public by design and is deliberately not checked for.
if docker run --rm --entrypoint sh "${IMAGE}" -c 'grep -rl "AQ\.Ab" dist/ 2>/dev/null | head -1' | grep -q .; then
  echo "✖ DỪNG: khoá Gemini lọt vào bundle. KHÔNG push image này." >&2
  exit 1
fi

# ── Guard 3: the image must stay small ───────────────────────────────────────
#
# Artifact Registry gives 0.5 GB free and then charges every month, forever, for
# images that stopped running long ago. The cleanup policy keeps three, so each
# has to fit in roughly a third of the allowance.
SIZE_MB=$(docker image inspect "${IMAGE}" --format='{{.Size}}' | awk '{print int($1/1048576)}')
echo "▶ image  ${SIZE_MB} MB"
if [ "${SIZE_MB}" -gt 250 ]; then
  echo "✖ DỪNG: ${SIZE_MB} MB vượt ngưỡng 250 MB — xem CLOUDRUN_ZERO_COST.md §2.2" >&2
  exit 1
fi

echo "▶ push"
docker push "${IMAGE}"

# Every flag below is a cost decision; CLOUDRUN_ZERO_COST.md §2.1 has the
# arithmetic. The short version: min-instances=0 and cpu-throttling are what
# keep an idle service at zero, and max-instances=1 is both a hard spend ceiling
# and the reason the in-memory spend guard in server/gemini.ts means what it
# says — its counters live in one process, so N instances would be N× the cap.
echo "▶ deploy"
RUNTIME_ENV="GEMINI_API_KEY=${GEMINI_API_KEY},GEMINI_MODEL=${GEMINI_MODEL:-},MAPILLARY_TOKEN=${MAPILLARY_TOKEN}"

# Workspace delivery is optional: the booking itself still works without it,
# but the UI will truthfully report that automatic email/calendar delivery is
# unavailable. Refuse a half-configured set because it is harder to diagnose
# than an intentionally disabled one.
if [ -n "${GOOGLE_WORKSPACE_CLIENT_ID:-}${GOOGLE_WORKSPACE_CLIENT_SECRET:-}${GOOGLE_WORKSPACE_REFRESH_TOKEN:-}${FIREBASE_WEB_API_KEY:-}" ]; then
  : "${GOOGLE_WORKSPACE_CLIENT_ID:?Thiếu GOOGLE_WORKSPACE_CLIENT_ID}"
  : "${GOOGLE_WORKSPACE_CLIENT_SECRET:?Thiếu GOOGLE_WORKSPACE_CLIENT_SECRET}"
  : "${GOOGLE_WORKSPACE_REFRESH_TOKEN:?Thiếu GOOGLE_WORKSPACE_REFRESH_TOKEN}"
  : "${FIREBASE_WEB_API_KEY:?Thiếu FIREBASE_WEB_API_KEY}"
  FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-${PROJECT}}"
  RUNTIME_ENV="${RUNTIME_ENV},FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},FIREBASE_WEB_API_KEY=${FIREBASE_WEB_API_KEY},GOOGLE_WORKSPACE_CLIENT_ID=${GOOGLE_WORKSPACE_CLIENT_ID},GOOGLE_WORKSPACE_CLIENT_SECRET=${GOOGLE_WORKSPACE_CLIENT_SECRET},GOOGLE_WORKSPACE_REFRESH_TOKEN=${GOOGLE_WORKSPACE_REFRESH_TOKEN}"
fi

gcloud run deploy "${SERVICE}" \
  --project="${PROJECT}" \
  --region="${REGION}" \
  --image="${IMAGE}" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=1 \
  --concurrency=80 \
  --cpu=1 \
  --memory=512Mi \
  --cpu-throttling \
  --timeout=30s \
  --port=8080 \
  --set-env-vars="${RUNTIME_ENV}"

URL=$(gcloud run services describe "${SERVICE}" \
  --project="${PROJECT}" --region="${REGION}" --format='value(status.url)')

echo
echo "════════════════════════════════════════════════════════════════"
echo "  LINK NỘP BÀI:  ${URL}"
echo "════════════════════════════════════════════════════════════════"
echo
echo "  Kiểm tra ngay:  URL=${URL} bash scripts/verify-cloudrun-cost.sh"
echo

#!/usr/bin/env bash
#
# Is the Cloud Run deployment still inside the free tier, and is the submitted
# link still alive?
#
# Reads only; changes nothing. Exits 1 if anything needs attention, so it can be
# wired into CI or a monthly reminder.
#
# Three of the settings checked here decide $0 versus roughly $60 a month, and
# all three can be changed from the Console without ever touching this repo —
# "Edit & Deploy New Revision" on the web is enough. That is the whole reason
# this script exists: five seconds instead of four screens of clicking.
#
# Every threshold is explained in CLOUDRUN_ZERO_COST.md.
#
#   npm run cloudrun:verify
#
set -uo pipefail

PROJECT="${PROJECT:-visgo-project}"
REGION="${REGION:-asia-southeast3}"
REPO="${REPO:-visgo}"
SERVICE="${SERVICE:-visgo-api}"
FAIL=0

say()  { printf '  %-44s %s\n' "$1" "$2"; }
good() { say "$1" "✓ $2"; }
bad()  { say "$1" "✖ $2"; FAIL=1; }
note() { say "$1" "· $2"; }

describe() {
  gcloud run services describe "${SERVICE}" \
    --project="${PROJECT}" --region="${REGION}" --format="$1" 2>/dev/null
}
annotation() {
  describe "value(spec.template.metadata.annotations.\"$1\")"
}

echo
echo "── Cloud Run configuration ─────────────────────────────────────"

URL="${URL:-$(describe 'value(status.url)')}"
if [ -z "${URL}" ]; then
  echo "  Không đọc được service '${SERVICE}' ở ${REGION}."
  echo "  Đã deploy chưa? Hoặc đặt REGION=asia-southeast1 rồi chạy lại."
  exit 1
fi

MIN=$(annotation 'autoscaling.knative.dev/minScale')
MAX=$(annotation 'autoscaling.knative.dev/maxScale')
THROTTLE=$(annotation 'run.googleapis.com/cpu-throttling')

# An empty annotation means the platform default, and the default is the safe
# value for both minScale and cpu-throttling. Treat blank as correct rather than
# as missing, or this reports a false alarm on every fresh deploy.
if [ -z "${MIN}" ] || [ "${MIN}" = "0" ]; then
  good "Minimum instances = ${MIN:-0}" "không chạy khi rảnh"
else
  bad  "Minimum instances = ${MIN}" "PHẢI là 0 — §2.1, ~\$60/tháng"
fi

if [ "${MAX}" = "1" ]; then
  good "Maximum instances = 1" "trần chi tiêu + chốt chi Gemini đúng"
else
  bad  "Maximum instances = ${MAX:-chưa đặt}" "nên là 1 — §2.1"
fi

if [ -z "${THROTTLE}" ] || [ "${THROTTLE}" = "true" ]; then
  good "CPU throttling = ${THROTTLE:-true}" "chỉ tính tiền lúc xử lý request"
else
  bad  "CPU throttling = ${THROTTLE}" "PHẢI là true — §2.1, ~\$60/tháng"
fi

echo
echo "── Artifact Registry ───────────────────────────────────────────"

BYTES=$(gcloud artifacts repositories describe "${REPO}" \
  --project="${PROJECT}" --location="${REGION}" --format='value(sizeBytes)' 2>/dev/null || echo 0)
MB=$(( ${BYTES:-0} / 1048576 ))
if [ "${MB}" -lt 450 ]; then
  good "Dung lượng kho = ${MB} MB" "dưới trần 512 MB"
else
  bad  "Dung lượng kho = ${MB} MB" "sắp/đã vượt 0,5 GB — §2.2"
fi

POLICIES=$(gcloud artifacts repositories describe "${REPO}" \
  --project="${PROJECT}" --location="${REGION}" --format='value(cleanupPolicies)' 2>/dev/null)
if [ -n "${POLICIES}" ]; then
  good "Cleanup policy" "đã gắn"
else
  bad  "Cleanup policy" "CHƯA gắn — kho phình mãi, §2.2"
fi

echo
echo "── Bài nộp có còn sống không ───────────────────────────────────"

CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "${URL}/" || echo 000)
if [ "${CODE}" = "200" ]; then
  good "GET ${URL}" "200"
else
  bad  "GET ${URL}" "${CODE} — LINK NỘP BÀI ĐANG HỎNG"
fi

# The rule is "accessible by the public". A service deployed without
# --allow-unauthenticated answers 403 to everyone but the person holding a
# gcloud token, which looks fine from the machine that deployed it.
ANON=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -H 'Authorization:' "${URL}/" || echo 000)
if [ "${ANON}" = "200" ]; then
  good "Truy cập ẩn danh" "công khai — đúng yêu cầu thể lệ"
else
  bad  "Truy cập ẩn danh" "${ANON} — thiếu --allow-unauthenticated?"
fi

# An all-in-one deployment must serve the app at the root, not the API-only 404.
if curl -s --max-time 20 "${URL}/" | grep -qi '<div id="root"\|<!doctype html'; then
  good "Gốc / trả HTML" "SPA đang được phục vụ"
else
  bad  "Gốc / trả" "không phải HTML — image thiếu dist/?"
fi

echo
echo "── /api ────────────────────────────────────────────────────────"

STATUS=$(curl -s --max-time 20 "${URL}/api/status" || echo '')
case "${STATUS}" in
  *'"gemini"'*) good "/api/status" "$(printf '%s' "${STATUS}" | head -c 90)" ;;
  *'<'*)        bad  "/api/status" "trả HTML — route /api không chạy" ;;
  *)            bad  "/api/status" "không đọc được" ;;
esac

if curl -s -I -H 'Accept-Encoding: gzip' --max-time 20 "${URL}/" | grep -qi 'content-encoding'; then
  good "Compression" "đang bật — egress giảm ~3 lần"
else
  note "Compression" "không thấy header (§P0.3)"
fi

echo
if [ "${FAIL}" -eq 0 ]; then
  echo "✅ Mọi thứ nằm trong vùng miễn phí và link nộp bài đang sống."
else
  echo "⚠️  Có mục cần sửa. Mở CLOUDRUN_ZERO_COST.md ở mục được chỉ."
fi
echo
exit "${FAIL}"

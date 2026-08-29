#!/usr/bin/env bash
#
# Tear down every piece of ViS-Go's Cloud Run infrastructure.
#
# Deleting the service does NOT delete the images. The registry is what charges
# storage every month once it passes 0.5 GB, and it keeps charging long after
# nothing is running — so step 2 matters exactly as much as step 1.
#
# Nothing here touches Firestore, Firebase Auth, Firebase Hosting or any stored
# image. The app keeps working without /api: aiClient.ts falls back to Firebase
# AI Logic and then to the in-browser RAG engine.
#
#   npm run cloudrun:destroy
#
set -uo pipefail

PROJECT="${PROJECT:-visgo-project}"
REGION="${REGION:-asia-southeast3}"
REPO="${REPO:-visgo}"
SERVICE="${SERVICE:-visgo-api}"

cat <<WARN

  Sẽ xoá:
    - Cloud Run service       ${SERVICE}    ← ĐÂY LÀ LINK NỘP BÀI DỰ THI
    - Artifact Registry repo  ${REPO}       (mọi image)
    - Cloud Function          visgo-killswitch
    - Pub/Sub topic           billing-alerts

  KHÔNG xoá: Firestore, tài khoản người dùng, Firebase Hosting, ảnh, mã nguồn.

WARN

read -r -p '  Ban giám khảo đã chấm xong chưa? (gõ "roi" để tiếp tục): ' ok
[ "${ok}" = "roi" ] || { echo "  Dừng."; exit 1; }

echo "▶ xoá Cloud Run service"
gcloud run services delete "${SERVICE}" \
  --project="${PROJECT}" --region="${REGION}" --quiet || true

echo "▶ xoá kho image  ← bước hay bị quên nhất"
gcloud artifacts repositories delete "${REPO}" \
  --project="${PROJECT}" --location="${REGION}" --quiet || true

echo "▶ xoá kill switch"
gcloud functions delete visgo-killswitch \
  --gen2 --project="${PROJECT}" --region="${REGION}" --quiet || true
gcloud pubsub topics delete billing-alerts --project="${PROJECT}" --quiet || true

echo "▶ bucket còn sót (xoá tay nếu thấy gcf-sources-* hoặc *_cloudbuild)"
gcloud storage buckets list --project="${PROJECT}" --format='value(name)' || true

cat <<'DONE'

  Còn hai việc phải làm bằng tay:

    1. Xoá budget
       console.cloud.google.com/billing → Budgets & alerts → xoá "ViS-Go kill switch"

    2. Về lại Spark — đây là thứ đảm bảo tuyệt đối không bao giờ có hoá đơn nữa
       Firebase Console → ⚙ → Usage and billing → Details & settings → Modify plan → Spark

  Sau 2-3 ngày: Billing → Reports → tháng hiện tại phải là $0,00

DONE

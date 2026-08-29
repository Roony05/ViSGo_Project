# Cloud Run — dùng mà không mất một đồng nào

> Tài liệu này chỉ nói về **tiền**. Cách deploy nằm ở `PLAN_CODEX.md` PHASE 0.
> Kiến trúc là **all-in-one**: một container Cloud Run phục vụ cả trang web lẫn `/api`
> (thể lệ #AIRiserVietnam bắt buộc — xem `PLAN_CODEX.md` §0.3).
> Mở file này ra và để bên cạnh trong lúc bấm trên Google Cloud Console.

---

## Nguyên tắc duy nhất

> **Google không tính tiền theo "bạn có dịch vụ gì". Google tính tiền theo "dịch vụ đó chạy bao nhiêu giây và giữ bao nhiêu byte".**

Một Cloud Run service tồn tại nhưng không ai gọi = **0 đồng**. Một container chạy 24/7 = **~$60/tháng**. Cùng một dịch vụ, khác nhau ở một ô tick.

Vì vậy toàn bộ tài liệu này là danh sách những **ô tick và hành động** làm đồng hồ bắt đầu chạy.

---

## PHẦN 1 — Bản đồ tiền: mọi thứ dự án này chạm tới

Cột cuối cùng là thứ bạn cần nhìn.

| # | Dịch vụ | Miễn phí mỗi tháng | Vượt thì bao nhiêu | App này dùng | Rủi ro |
|---|---|---|---|---|---|
| 1 | **Cloud Run — vCPU** | 180.000 vCPU-giây | ~$0,000024/giây | ~45.000 (25%) | 🟡 Xem §2.1 |
| 2 | **Cloud Run — RAM** | 360.000 GiB-giây | ~$0,0000025/giây | ~22.000 (6%) | 🟢 An toàn |
| 3 | **Cloud Run — request** | 2.000.000 | $0,40/triệu | vài nghìn | 🟢 An toàn |
| 4 | **Cloud Run — egress** | **1 GiB, chỉ Bắc Mỹ** | ~$0,12/GiB | ~0,1-0,4 GB *(gzip + cache)* | 🟡 Xem §2.3 |
| 5 | **Artifact Registry** | **0,5 GB** | $0,10/GB/tháng | 210 MB *(nếu có cleanup)* | 🔴 Xem §2.2 |
| 6 | **Cloud Logging** | 50 GiB/project | $0,50/GiB | vài chục MB | 🟢 An toàn |
| 7 | **Cloud Build** | 2.500 phút | $0,003/phút | **0** — build ở máy bạn | 🟢 Không dùng |
| 8 | **Cloud Storage** (bucket staging) | 5 GB, **chỉ region Mỹ** | ~$0,02/GB | **0** — không dùng `--source` | 🟢 Không dùng |
| 9 | **Secret Manager** | 6 phiên bản | $0,06/phiên bản | **0** — dùng env var | 🟢 Không dùng |
| 10 | **Cloud Functions** (kill switch) | 2 triệu lượt gọi | — | ~5 lượt/tháng | 🟢 An toàn |
| 11 | **Pub/Sub** (billing-alerts) | 10 GiB | $40/TiB | vài KB | 🟢 An toàn |
| 12 | **Firestore** | 50k đọc + 20k ghi/ngày | $0,03/100k đọc | có cache 30s | 🟡 Xem §2.5 |
| 13 | **Firebase Hosting** | 10 GB lưu + 360 MB/ngày | $0,15/GB | bundle 1,5 MB + CDN | 🟡 Xem §2.5 |
| 14 | **Load Balancer** | ❌ **KHÔNG CÓ free tier** | **~$18-25/tháng** | **0** — không tạo | 🔴 Xem §2.4 |
| 15 | **Gemini Developer API** | quota theo phút/ngày | tuỳ mức | chốt 800/ngày trong code | 🟢 An toàn |

**Đọc bảng này thế nào:** 🔴 = chỗ thật sự mất tiền nếu làm sai. 🟡 = an toàn nhưng phải biết. 🟢 = không cần lo.

---

## PHẦN 2 — Bảy hành động làm bạn mất tiền

Xếp theo thứ tự **dễ xảy ra nhất trước**.

### 2.1 🔴 Bật `Minimum instances` hoặc `CPU always allocated`

**Đây là cái đắt nhất và dễ bấm nhầm nhất.**

Google sẽ gợi ý cả hai với lý do "giảm cold start". Cả hai đều biến đồng hồ tính tiền từ *chỉ khi có người dùng* thành *chạy suốt 24/7*.

Phép tính, không làm tròn:

```
1 container chạy liên tục 30 ngày  =  2.592.000 giây
Trừ free tier                       −    180.000 giây
                                    ─────────────────
Phải trả                            =  2.412.000 giây

2.412.000 × $0,000024   ≈  $57,9   (vCPU)
Cộng RAM 512 MB          ≈  $ 2,7
                            ───────
                            ~$60/tháng
```

**Từ $0 lên $60 chỉ bằng một ô tick, và bạn sẽ không nhận ra cho tới cuối tháng.**

| Đúng | Sai |
|---|---|
| Minimum instances = **0** | Minimum instances = 1 |
| CPU allocation = **"CPU is only allocated during request processing"** | "CPU is always allocated" |

Lệnh trong `scripts/deploy-cloudrun.sh` đã khai đúng (`--min-instances=0 --cpu-throttling`). **Nguy hiểm nằm ở lúc bạn vào Console sửa tay.** Nếu bấm "Edit & Deploy New Revision" trên web, hãy kiểm tra lại hai ô đó trước khi bấm Deploy.

> Cold start 1-2 giây **không đáng** $60/tháng. Đừng đổi.

---

### 2.2 🔴 Artifact Registry phình quá 0,5 GB

Mỗi lần `npm run deploy:api` là một image ~80 MB **nằm lại vĩnh viễn** trong kho. Google không tự dọn.

```
Deploy lần 1  →   80 MB   ✅
Deploy lần 4  →  320 MB   ✅
Deploy lần 6  →  480 MB   ✅  ← sát trần
Deploy lần 7  →  560 MB   💸  bắt đầu tính tiền
Deploy lần 30 →  2,4 GB   💸  ~$0,19/tháng, và tăng mãi
```

Số tiền nhỏ, nhưng nó là **loại phí không bao giờ dừng** — bạn trả hàng tháng cho những image đã chết từ lâu.

**Cách chặn — làm NGAY lúc tạo repo, không phải "để sau":**

```bash
gcloud artifacts repositories set-cleanup-policies visgo \
  --location=$REGION --project=$PROJECT \
  --policy=docker/artifact-cleanup-policy.json
```

Policy đó (`docker/artifact-cleanup-policy.json`) giữ 3 image mới nhất, xoá phần còn lại sau 7 ngày. Kho sẽ đứng yên ở ~240 MB mãi mãi.

`scripts/deploy-cloudrun.sh` còn có một chốt thứ hai: nó **từ chối push** image lớn hơn 250 MB.

**Kiểm tra dung lượng hiện tại bất cứ lúc nào:**

```bash
gcloud artifacts repositories describe visgo \
  --location=$REGION --format='value(sizeBytes)'
# Chia cho 1073741824 để ra GB. Phải < 0,5
```

---

### 2.3 🟡 Băng thông file tĩnh — khoản duy nhất khác 0, và nó có lý do

Free tier băng thông ra Internet của Cloud Run là **1 GiB/tháng, và Google chỉ tính khoản miễn phí đó ở Bắc Mỹ**. Deploy ở châu Á = **tính tiền từ byte đầu tiên**, khoảng $0,12/GiB.

> ⚠️ **Mục này từng khuyên ngược lại.** Bản đầu nói "đừng cho Cloud Run phục vụ file tĩnh, để Firebase Hosting giữ phần đó". Thể lệ #AIRiserVietnam đóng cửa lựa chọn ấy: *"For web apps, the solution must be hosted on Google Cloud Run **only**"* — link nộp bài phải là `*.run.app`, nên container phải phục vụ cả trang web. Xem `PLAN_CODEX.md` §0.3.

Con số thật sau khi đã bật nén và cache (đo trên bản build hiện tại):

```
Bundle nạp lần đầu:  ~675 KB  →  gzip  →  206 KB
                                          (đo được, giảm 69%)

500 lượt xem (chấm thi)   ≈ 0,10 GB  ≈  $0,01
2.000 lượt                ≈ 0,41 GB  ≈  $0,05
10.000 lượt               ≈ 2,06 GB  ≈  $0,25
```

**Hai thứ đang giữ con số đó ở mức cent, cả hai nằm trong `server/index.ts`:**

1. `app.use(compression())` — gzip, cắt 69% mỗi lượt tải.
2. `express.static(distDir, { maxAge: '1y' })` — Vite gắn fingerprint vào tên file nên cache một năm là an toàn; `index.html` được ép `no-cache` để không ai mắc kẹt ở bản deploy cũ. Giám khảo mở lần thứ hai không tải lại bundle.

**Kiểm chứng bất cứ lúc nào:**

```bash
curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: identity' $URL/assets/index-*.js
curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: gzip'     $URL/assets/index-*.js
# Số thứ hai phải nhỏ hơn số thứ nhất khoảng 3 lần.
```

**Dấu hiệu image bị dựng sai:** mở `https://<url>.run.app` mà thấy `{"error":"This deployment serves /api only."}` → image thiếu `dist/`, và 10 điểm Deployment mất mà không có log nào báo. `scripts/deploy-cloudrun.sh` có chốt chặn đúng trường hợp này trước khi push.

---

### 2.4 🔴 Tạo Load Balancer để gắn tên miền riêng

**Load Balancer là dịch vụ duy nhất trong danh sách KHÔNG CÓ free tier.** Nó tính tiền theo giờ, kể cả khi không ai truy cập: **~$18-25/tháng, ngay từ giờ đầu tiên.**

Bạn sẽ gặp nó nếu Google gợi ý "Set up a custom domain" cho Cloud Run.

**Đừng làm.** Bạn không cần:

- Tên miền riêng đã có sẵn **miễn phí** trên Firebase Hosting (Hosting → Add custom domain).
- Link `*.run.app` mà Google cấp sẵn đã đủ cho thể lệ: nó live, công khai, và chạy trên Cloud Run. Đó là toàn bộ yêu cầu của 10 điểm Deployment.

---

### 2.5 🟡 Vượt quota Firestore / Hosting *sau khi lên Blaze*

Đây là thứ **thay đổi bản chất**, không phải một con số.

| | Spark (hiện tại) | Blaze (sau khi bật billing) |
|---|---|---|
| Firestore free | 50k đọc + 20k ghi/ngày | **giống hệt** |
| Hosting free | 10 GB + 360 MB/ngày | **giống hệt** |
| **Vượt quota thì sao** | ⛔ **App báo lỗi và dừng. Không bao giờ có hoá đơn.** | 💸 **Tính tiền.** |

Con số miễn phí y nguyên. Thứ mất đi là **cái phanh cứng**.

Đó là lý do plan có kill switch ở §4.9 Lớp 3 — nó là cái phanh bạn tự dựng để thay thế.

**Mức dùng thật của app:** `firestoreDb.ts` có cache 30 giây và chỉ ghi delta, nên cách trần rất xa. Nhưng "rất xa" không phải "không thể", nên budget vẫn là thứ canh nó.

---

### 2.6 🟡 Dùng `gcloud run deploy --source .`

Lệnh này tiện, nhưng nó **âm thầm kéo theo hai dịch vụ nữa**:

- **Cloud Build** — build image trên máy Google (2.500 phút/tháng miễn phí, đủ dùng)
- **Cloud Storage** — tạo bucket `<project>_cloudbuild` để chứa mã nguồn tạm. **Free tier 5 GB của Cloud Storage chỉ áp dụng ở region Mỹ.** Bucket ở Bangkok/Singapore → tính tiền từ byte đầu.

Số tiền cực nhỏ (vài cent), nhưng nó là **hai dịch vụ nữa xuất hiện trong hoá đơn mà bạn không chủ động bật**, và mỗi dịch vụ trong hoá đơn là một thứ nữa phải theo dõi.

**Cách chặn:** `scripts/deploy-cloudrun.sh` trong plan build bằng Docker **ở máy bạn** rồi push thẳng. Không Cloud Build, không bucket, không gì cả.

---

### 2.7 🟡 Đổi `--timeout` lên cao

Mặc định của Cloud Run là **300 giây**. Plan đặt **30 giây**.

Vì sao quan trọng: nếu một request bị treo (Gemini không trả lời, mạng đứt), container **vẫn thức và vẫn tính tiền** cho tới khi hết timeout.

```
timeout=300s, 10 request treo  =  3.000 giây bị đốt
timeout= 30s, 10 request treo  =    300 giây
```

`generate()` trong `server/gemini.ts` đã tự có ngân sách ~12 giây mỗi model, nên 30 giây là dư.

---

## PHẦN 3 — Đường an toàn tuyệt đối: dùng Free Trial billing account

Đây là phát hiện quan trọng nhất, và nó thay đổi lời khuyên của tôi.

**Nếu tài khoản Google của bạn chưa từng dùng Google Cloud Free Trial**, bạn có thể mở một **Free Trial billing account** ($300 credit / 90 ngày). Với loại tài khoản này:

> **Bạn KHÔNG THỂ bị tính tiền. Kể cả khi làm sai mọi thứ trong Phần 2.**

Cơ chế theo tài liệu chính thức của Google:

- Hết $300 credit **hoặc** hết 90 ngày → billing account **tự đóng**, project bị tắt billing, workload dừng.
- **Google không tự động tính tiền vào thẻ.** Muốn bị tính tiền, bạn phải **tự tay bấm "Upgrade to a paid account"**.
- Sau khi trial kết thúc còn **30 ngày ân hạn** để bạn upgrade và lấy lại dữ liệu. Không upgrade thì resource bị xoá và **vẫn không bị tính tiền**.

Nghĩa là trong 90 ngày đầu, kịch bản xấu nhất của bạn không phải "hoá đơn $60" mà là **"app dừng chạy"** — đúng bằng mức an toàn của Spark.

**Kiểm tra bạn có đủ điều kiện không:** vào https://console.cloud.google.com/billing → nếu thấy nút *"Activate free trial"* hoặc *"Start my free trial"* thì có.

**Đánh đổi:** sau 90 ngày app sẽ dừng và bạn phải quyết định — upgrade lên paid account (và lúc đó Phần 2 mới thật sự quan trọng), hoặc quay về Spark. Đây là đường tốt để **thử và học** mà không rủi ro gì, không phải đường chạy production lâu dài.

> Thẻ vẫn phải gắn để mở trial. Nhưng gắn thẻ ≠ bị trừ tiền: Google chỉ dùng nó để xác minh danh tính, và có thể tạm giữ ~$1 rồi hoàn lại.

---

## PHẦN 4 — Checklist trước khi bấm Deploy

Đọc từ trên xuống, tick từng dòng.

- [ ] Đã kiểm tra có đủ điều kiện Free Trial chưa (Phần 3) — nếu có thì dùng nó
- [ ] Budget **$1** đã tạo, nối vào Pub/Sub topic `billing-alerts`
- [ ] Kill switch function đã deploy **và** service account của nó có `roles/billing.projectManager`
- [ ] Cleanup policy của Artifact Registry đã gắn (§2.2)
- [ ] Image runtime có `dist/index.html`, nhưng không có `.env`, source TypeScript hay khóa Gemini trong bundle
- [ ] Lệnh deploy có đủ: `--min-instances=0 --max-instances=1 --cpu-throttling --timeout=30s`
- [ ] **Không** dùng `gcloud run deploy --source` — build bằng Docker ở máy
- [ ] **Không** tạo Load Balancer, **không** map custom domain cho Cloud Run
- [ ] Khoá để trong `--set-env-vars`, **không** dùng Secret Manager
- [ ] Đã bật cảnh báo email: Billing → Budgets → tick "Email alerts to billing admins"

---

## PHẦN 5 — Kiểm tra ngay sau khi deploy

```bash
# 1. Cấu hình có đúng không — ba dòng này quyết định $0 hay $60
gcloud run services describe visgo-api --region=$REGION \
  --format='yaml(spec.template.metadata.annotations)' | grep -E 'minScale|maxScale|cpu-throttling'
# minScale: "0"      ← phải là 0
# maxScale: "1"      ← phải là 1
# cpu-throttling: "true"

# 2. Image all-in-one PHẢI phục vụ frontend
curl -s https://<url>.run.app/
# Phải thấy HTML có <div id="root">.
# Nếu thấy JSON "serves /api only" → image thiếu dist/, xem §2.3

# 3. Kho image chưa phình
gcloud artifacts repositories describe visgo --location=$REGION --format='value(sizeBytes)'

# 4. Cleanup policy đã có
gcloud artifacts repositories describe visgo --location=$REGION --format='yaml(cleanupPolicies)'

# 5. Chốt chi Gemini còn sống trên chính link Cloud Run nộp bài
curl -s https://<url>.run.app/api/status | jq '.spendGuard'
```

---

## PHẦN 6 — Việc kiểm tra hàng tháng (5 phút)

Đặt lịch nhắc mỗi tháng một lần.

1. **Xem hoá đơn:** https://console.cloud.google.com/billing → **Reports**
   Chọn *Group by: SKU*. Nếu tổng khác **$0,00**, đọc xem SKU nào — nó chỉ thẳng vào một mục trong Phần 2.
2. **Xem kho image:** lệnh số 3 ở Phần 5. Phải < 0,5 GB.
3. **Xem chốt chi:** `curl .../api/status` → `usedToday` gần 800 nghĩa là có người gọi bất thường.

---

## PHẦN 7 — Xoá sạch khi không dùng nữa

> **Trả lời ngắn: có, xoá được hết, và xoá xong là ngừng tính tiền ngay lập tức.**
> Không có hợp đồng, không có cam kết thời hạn, không có phí huỷ.

Nhưng **thứ tự quan trọng**, vì xoá sai thứ tự sẽ làm website của bạn hỏng trong lúc chờ.

### Bước 0 — Đợi đã: link này là bài dự thi

⛔ **Đừng chạy trước khi ban giám khảo #AIRiserVietnam chấm xong.** Xoá service là link nộp bài chết, và 10 điểm Deployment đi theo nó.

Kiến trúc all-in-one nghĩa là **không còn rewrite nào trong `firebase.json` để gỡ** — Cloud Run tự phục vụ cả trang web. Nên quy trình bắt đầu thẳng từ Bước 1.

Bản deploy trên Firebase Hosting (nếu bạn vẫn giữ) **không bị ảnh hưởng gì**: nó độc lập, và ở đó `hasApiBackend()` trả `false` nên AI tự rơi về Firebase AI Logic rồi engine offline. Đó là lý do `aiClient.ts` được viết với ba tầng dự phòng.

Toàn bộ quy trình dưới đây đã được đóng gói thành lệnh:

```bash
npm run cloudrun:destroy
```

Script hỏi xác nhận trước, rồi chạy đúng thứ tự Bước 1 → 5. Muốn làm tay thì đọc tiếp.

### Bước 2 — Xoá Cloud Run service

```bash
gcloud run services delete visgo-api --region=$REGION --project=$PROJECT
```

→ Đồng hồ vCPU/RAM/request/egress **dừng ngay lập tức**.

### Bước 3 — Xoá kho image

**Đây là bước hay bị quên nhất.** Xoá service không xoá image; kho vẫn nằm đó và vẫn tính tiền lưu trữ hàng tháng.

```bash
gcloud artifacts repositories delete visgo --location=$REGION --project=$PROJECT
```

### Bước 4 — Xoá kill switch và budget

```bash
gcloud functions delete visgo-killswitch --gen2 --region=$REGION --project=$PROJECT
gcloud pubsub topics delete billing-alerts --project=$PROJECT

# Budget: xoá trên console
# https://console.cloud.google.com/billing → Budgets & alerts → xoá "ViS-Go kill switch"
```

### Bước 5 — Dọn bucket còn sót

Cloud Functions tự tạo bucket chứa mã nguồn. Kiểm tra và dọn:

```bash
gcloud storage buckets list --project=$PROJECT
# Tìm: gcf-sources-*, *_cloudbuild, run-sources-*
gcloud storage rm --recursive gs://<tên-bucket>
```

### Bước 6 — Về lại Spark (khuyến nghị mạnh)

Đây là bước **đảm bảo tuyệt đối** không bao giờ có hoá đơn nữa:

**Firebase Console** → ⚙️ → **Usage and billing** → **Details & settings** → **Modify plan** → chọn **Spark**.

Hoặc gỡ billing khỏi project:

```bash
gcloud billing projects unlink $PROJECT
```

Sau bước này project trở lại đúng như trước khi bạn bắt đầu: vượt quota thì app báo lỗi, **không tồn tại đường nào ra hoá đơn**.

### Những gì **KHÔNG** bị xoá — yên tâm

| Thứ | Sau khi xoá Cloud Run |
|---|---|
| Dữ liệu Firestore (tour, booking, user, review) | ✅ Còn nguyên |
| Tài khoản đăng nhập (Firebase Auth) | ✅ Còn nguyên |
| Website trên Firebase Hosting | ✅ Vẫn chạy bình thường |
| Ảnh, avatar, video đã lưu | ✅ Còn nguyên |
| Code trong repo | ✅ Còn nguyên — deploy lại lúc nào cũng được |

**Bạn chỉ mất `/api`.** Và app đã được viết để sống thiếu nó.

### Xoá xong có phải trả nốt gì không?

Google tính tiền **theo mức đã dùng, cuối mỗi tháng**. Xoá giữa tháng thì bạn vẫn "nợ" phần đã dùng trước đó — với app này là **$0,00**, nên không có gì để trả.

Kiểm tra lần cuối sau 2-3 ngày: Billing → Reports → chọn tháng hiện tại. Nếu là $0,00 thì xong hẳn.

---

## PHẦN 8 — Nếu lỡ thấy hoá đơn khác $0

Làm theo đúng thứ tự này:

1. **Chặn máu trước, tìm nguyên nhân sau.**
   ```bash
   gcloud run services update visgo-api --region=$REGION --min-instances=0 --cpu-throttling
   ```
   Nếu chưa rõ nguyên nhân, xoá thẳng service (Phần 7 Bước 1-2). Deploy lại chỉ mất 2 phút.

2. **Tìm thủ phạm:** Billing → Reports → **Group by: SKU**.
   Tên SKU chỉ thẳng vào một mục trong Phần 2:

   | SKU chứa chữ | Nguyên nhân | Đọc |
   |---|---|---|
   | `CPU Allocation Time` / `Memory Allocation Time` | min-instances hoặc CPU always allocated | §2.1 |
   | `Artifact Registry Storage` | kho image phình | §2.2 |
   | `Network Egress` / `Internet Data Transfer` | Cloud Run đang serve file tĩnh | §2.3 |
   | `Forwarding Rule` / `Load Balancing` | đã tạo Load Balancer | §2.4 |
   | `Cloud Firestore Read/Write` | vượt quota Firestore | §2.5 |
   | `Cloud Storage` | dùng `--source` deploy | §2.6 |

3. **Xin miễn giảm.** Nếu là lần đầu và số tiền nhỏ, Google Cloud Billing Support thường miễn cho lỗi cấu hình lần đầu. Vào Billing → **Support** → mở ticket, nói rõ đây là project cá nhân và bạn đã sửa cấu hình.

---

## Tóm tắt một màn hình

```
┌─────────────────────────────────────────────────────────────┐
│  BỐN THỨ TUYỆT ĐỐI ĐỪNG LÀM                                 │
├─────────────────────────────────────────────────────────────┤
│  1. Đừng đặt Minimum instances > 0        →  $60/tháng      │
│  2. Đừng bật "CPU always allocated"       →  $60/tháng      │
│  3. Đừng tạo Load Balancer / custom domain cho Cloud Run    │
│                                            →  $18-25/tháng  │
│  4. Đừng deploy quá 7 lần khi chưa gắn cleanup policy       │
│                                            →  $0,10/GB/tháng│
├─────────────────────────────────────────────────────────────┤
│  BỐN THỨ PHẢI LÀM                                           │
├─────────────────────────────────────────────────────────────┤
│  1. Cleanup policy Artifact Registry — NGAY lúc tạo repo    │
│  2. Budget $1 + kill switch tự gỡ billing                   │
│  3. Firebase Hosting giữ file tĩnh, Cloud Run chỉ trả JSON  │
│  4. Mỗi tháng mở Billing → Reports, xác nhận $0,00          │
├─────────────────────────────────────────────────────────────┤
│  KHI KHÔNG CẦN NỮA                                          │
├─────────────────────────────────────────────────────────────┤
│  npm run cloudrun:destroy  →  rồi về Spark trên console      │
│  Dữ liệu Firestore, tài khoản, website: KHÔNG mất gì.       │
└─────────────────────────────────────────────────────────────┘
```

---

## Nguồn

- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)
- [Cloud Logging pricing](https://cloud.google.com/stackdriver/pricing)
- [Network Service Tiers pricing](https://cloud.google.com/network-tiers/pricing)
- [Secret Manager pricing](https://cloud.google.com/secret-manager/pricing)
- [Google Cloud Free Trial FAQs](https://cloud.google.com/signup-faqs)
- [Free Google Cloud features and trial offer](https://cloud.google.com/free/docs/free-cloud-features)
- [Disable billing with notifications](https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications)

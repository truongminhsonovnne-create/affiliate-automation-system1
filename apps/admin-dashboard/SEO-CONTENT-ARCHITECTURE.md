# SEO Content & Landing Page Architecture
## VoucherFinder — Hệ sinh thái nội dung

---

## PHÂN TÍCH SEARCH INTENT NGƯỜI DÙNG VIỆT NAM

Trước khi thiết kế cấu trúc, cần nắm rõ các nhóm intent thực tế:

| Nhóm intent | Ví dụ từ khóa | Mục tiêu |
|---|---|---|
| **Tìm mã giảm giá cụ thể** | "mã giảm giá Shopee hôm nay", "voucher Shopee free ship" | Chuyển đổi ngay → dùng tool |
| **Tìm deal theo danh mục** | "deal điện thoại giảm giá", "voucher thời trang Shopee" | Khám phá deal |
| **Hướng dẫn / giải thích** | "cách lấy mã giảm giá Shopee", "voucher Shopee là gì" | Hướng dẫn + chuyển đổi |
| **So sánh / đánh giá** | "so sánh các đợt sale Shopee", "Shopee hay Lazada voucher nào tốt hơn" | So sánh |
| **Theo dõi sự kiện** | "lịch sale Shopee 2026", "Shopee 3.3 khi nào" | Thông tin |

---

## 1. LOẠI PAGE CẦN CÓ

### Type A — Trang kéo traffic (TOFU / MOFU)
- Landing page theo danh mục sản phẩm
- Trang đợt sale / sự kiện
- Bài viết blog / hướng dẫn
- Trang so sánh

### Type B — Trang chuyển đổi chính (BOFU)
- Trang chủ (`/home`) — điểm vào chính
- Trang deals (`/deals`) — khám phá deal
- Trang kết quả tra cứu (dynamic, không cần SEO)

### Type C — Trang hỗ trợ chuyển đổi
- Trang about, contact
- Trang giới thiệu sản phẩm (tool)
- Trang confidence score / FAQ

---

## 2. URL STRUCTURE ĐỀ XUẤT

```
/                          → Trang chủ (redirect /home hoặc merge)
/home                      → Tool tra cứu chính (Priority 1.0)

/deals                     → Tổng hợp tất cả deal
/deals/hot                 → Deal hot hôm nay
/deals/expiring            → Deal sắp hết hạn
/deals/source/[platform]  → Deal theo nguồn (masoffer, accesstrade)

  NGUỒN SÀN
/deals/shopee              → Tất cả deal Shopee
/deals/lazada              → Tất cả deal Lazada (nếu mở rộng)
/deals/tiki                → Tất cả deal Tiki (nếu mở rộng)

  DANH MỤC SẢN PHẨM
/deals/dien-thoai          → Deal điện thoại
/deals/laptop              → Deal laptop
/deals/may-tinh-bang       → Deal máy tính bảng
/deals/thoi-trang-nam     → Deal thời trang nam
/deals/thoi-trang-nu      → Deal thời trang nữ
/deals/my-pham            → Deal mỹ phẩm
/deals/me-be               → Deal mẹ & bé
/deals/nha-cua            → Deal nhà cửa
/deals/sach               → Deal sách
/deals/the-thao            → Deal thể thao
/deals/tui-xach            → Deal túi xách

  SỰ KIỆN / ĐỢT SALE
/deals/sale-11-11          → Deal 11.11
/deals/sale-9-9            → Deal 9.9
/deals/sale-12-12          → Deal 12.12
/deals/sale-flash-sale     → Deal Flash Sale

/blog                      → Hub bài viết (rename /resources → /blog)
/blog/[slug]               → Bài viết riêng

/info                      → Trang thông tin
/info/about
/info/contact
/info/privacy
/info/terms
/info/cookies
/info/affiliate-disclosure
```

### Nguyên tắc URL:
- **Phẳng, có ý nghĩa**: `/deals/dien-thoai` thay vì `/category/phones`
- **Từ khóa tiếng Việt không dấu**: SEO-friendly, user đọc được
- **Không lồng quá sâu**: Tối đa 2 cấp cho static pages
- **Dynamic routes cho deal filtering**: `/deals/category/[cat]` nếu cần server-side filter

---

## 3. INTERNAL LINKING STRUCTURE

### Silo Top-Level

```
HOME / TOOL
│
├── Header Nav
│   ├── /deals (Mega Menu: Tất cả | Hot | Hết hạn | Theo sàn)
│   ├── /deals/dien-thoai  (dropdown: theo danh mục)
│   ├── /deals/thoi-trang-nam
│   ├── /deals/my-pham
│   └── /blog
│
├── In-Article CTA (mỗi bài viết)
│   ├── "Tìm mã cho sản phẩm này →"
│   └── Related deals cards
│
└── Footer
    ├── Deals: Hot | Expiring | Shopee | Lazada | Tiki
    ├── Danh mục: Điện thoại | Laptop | Thời trang | Mỹ phẩm
    ├── Blog: Các bài viết mới nhất
    └── Info: About | Contact | Privacy | Terms
```

### Silo Content (Blog → Deals → Tool)

```
Blog post: "Hướng dẫn mua điện thoại giá tốt nhất trên Shopee"
│
├── Internal links:
│   ├── "Xem deal điện thoại hiện có →"  → /deals/dien-thoai
│   ├── "Tìm mã cho sản phẩm cụ thể →"   → /home
│   └── "So sánh 9.9 vs 11.11"            → /blog/so-sanh-sale-shopee
│
├── Sidebar / End:
│   └── 3 deals điện thoại hot nhất (lấy từ DB)
│
└── Schema: Article + FAQPage
```

### Silo Deals (Category → Brand / Event)

```
/deals/dien-thoai (Category Page)
│
├── Header: "Deal điện thoại — [số lượng] voucher đang hoạt động"
├── Filter: Sort by (Giảm nhiều nhất | Hết hạn sớm | Mới nhất)
├── Grid: Voucher cards với internal links
│   └── Mỗi card: "Tìm mã cho sản phẩm cụ thể" → /home
│
├── Sidebar:
│   ├── "Bài viết liên quan"
│   │   ├── "Cách mua điện thoại giá tốt"     → /blog/mua-dien-thoai-tiet-kiem
│   │   ├── "Lịch sale điện thoại 2026"       → /blog/lich-sale-shopee-2026
│   │   └── "Top deal điện thoại tháng này"  → /blog/top-deal-dien-thoai
│   │
│   └── "Deal danh mục khác"
│       ├── Laptop  →
│       ├── Tablet   →
│       └── Thời trang →
│
└── Footer CTA:
    "Tìm mã cho điện thoại cụ thể của bạn" → /home
```

### Anchor Text Strategy

| From page | Link to | Anchor text |
|---|---|---|
| Blog post | /deals/[cat] | "xem deal [danh mục]" |
| Blog post | /home | "tìm mã cho sản phẩm này" |
| /deals/[cat] | Blog related | "bài viết liên quan" |
| /deals/[cat] | /home | "tìm mã cụ thể" |
| Footer | /deals/[cat] | Tên danh mục |
| Footer | /blog | Tên bài viết hot |

---

## 4. 20 LANDING PAGES ĐẦU TIÊN

### Tier 1 — Cao nhất (làm trước, kéo traffic nhiều nhất)

| # | URL | Lý do ưu tiên |
|---|---|---|
| 1 | `/deals/shopee` | Shopee là nguồn chính — volume tìm kiếm voucher cao nhất |
| 2 | `/deals/hot` | Intent thấp rõ: "deal hot hôm nay" — người dùng có nhu cầu ngay |
| 3 | `/deals/sale-11-11` | Sự kiện lớn nhất năm, volume cực cao trong tháng 11 |
| 4 | `/deals/dien-thoai` | Danh mục có volume tìm kiếm "voucher điện thoại" rất lớn |
| 5 | `/blog/lich-sale-shopee-2026` | Thông tin thường tìm — "lịch sale Shopee" là từ khóa ổn định |
| 6 | `/deals/expiring` | Giá trị UX + SEO — "voucher sắp hết hạn" là intent rõ ràng |
| 7 | `/deals/thoi-trang-nam` | Danh mục thời trang có volume cao |
| 8 | `/deals/my-pham` | Danh mục mỹ phẩm — tìm kiếm "voucher mỹ phẩm" ổn định quanh năm |
| 9 | `/blog/cach-lay-ma-giam-gia-shopee` | Hướng dẫn căn bản — high-volume, low competition |
| 10 | `/blog/voucher-shopee-free-ship` | Intent rõ ràng, dễ viết, có search volume |

### Tier 2 — Mở rộng (làm sau khi Tier 1 xong)

| # | URL | Lý do |
|---|---|---|
| 11 | `/deals/laptop` | Danh mục laptop có volume tìm kiếm ổn định |
| 12 | `/deals/me-be` | Danh mục mẹ & bé — intent mua sắm rõ ràng |
| 13 | `/deals/sale-9-9` | Sự kiện lớn thứ 2, volume cao tháng 9 |
| 14 | `/blog/so-sanh-voucher-shopee` | So sánh — intent nghiên cứu, dễ rank |
| 15 | `/deals/nha-cua` | Danh mục nhà cửa — ít competition |
| 16 | `/blog/top-deal-dien-thoai` | Bài viết tổng hợp — internal linking hub |
| 17 | `/deals/thoi-trang-nu` | Cân bằng với thời trang nam |
| 18 | `/deals/the-thao` | Danh mục thể thao |
| 19 | `/blog/ma-giam-gia-toi-da-shopee` | Intent cụ thể: "giảm nhiều nhất" |
| 20 | `/deals/sach` | Danh mục sách — volume thấp nhưng dễ rank, chuyển đổi tốt |

---

## 5. 20 CHỦ ĐỀ BÀI VIẾT ĐẦU TIÊN

### Knowledge / Kiến thức (5 bài)

| # | Slug | Tiêu đề đề xuất | Search intent |
|---|---|---|---|
| 1 | `voucher-shopee-la-gi` | Voucher Shopee là gì? Tất tần tật về các loại mã giảm giá | Giải thích căn bản |
| 2 | `cac-loai-voucher-shopee` | [Đã có] Các loại voucher Shopee — Phân biệt và cách sử dụng | Phân biệt |
| 3 | `voucher-shopee-co-gia-tri-bao-nhieu` | Voucher Shopee có giá trị bao nhiêu? Khi nào nên dùng? | Định giá voucher |
| 4 | `tim-voucher-shopee-o-dau` | 5 cách tìm voucher Shopee tốt nhất — Không phải ai cũng biết | Hướng dẫn |
| 5 | `confidence-score-la-gi` | [Đã có] Confidence Score là gì? | Giải thích tính năng |

### Hướng dẫn / How-to (6 bài)

| # | Slug | Tiêu đề đề xuất | Search intent |
|---|---|---|---|
| 6 | `cach-su-dung-voucher-shopee` | Cách sử dụng voucher Shopee — Từng bước cho người mới | Hướng dẫn A-Z |
| 7 | `mua-dien-thoai-tiet-kiem` | [Đã có] Cách mua điện thoại giá tốt nhất trên Shopee | Hướng dẫn theo danh mục |
| 8 | `cach-dat-hang-tren-shopee` | Cách đặt hàng trên Shopee cho người mới — Đầy đủ từ A đến Z | Hướng dẫn căn bản |
| 9 | `san-giay-chinh-hang` | [Đã có] Săn giày chính hãng giá tốt — Kinh nghiệm thực tế | Hướng dẫn theo danh mục |
| 10 | `cach-khong-mua-phai-hang-gia` | Cách nhận biết hàng giả/hàng nhái trên Shopee | Hướng dẫn bảo vệ người mua |
| 11 | `su-dung-shopee-bang-dien-thoai` | Hướng dẫn mua sắm trên Shopee bằng điện thoại — Nhanh gọn trong 5 phút | Hướng dẫn mobile |

### Sự kiện / Đợt sale (5 bài)

| # | Slug | Tiêu đề đề xuất | Search intent |
|---|---|---|---|
| 12 | `lich-sale-shopee-2026` | Lịch sale Shopee 2026 — Tất cả các đợt giảm giá lớn | Thông tin lịch |
| 13 | `shopee-11-11-2026` | Shopee 11.11 2026 — Hướng dẫn săn deal ngày Độc thân | Event page |
| 14 | `shopee-9-9-2026` | Shopee 9.9 2026 — Deal gì? Mua gì? Chuẩn bị ra sao? | Event page |
| 15 | `flash-sale-la-gi` | Flash Sale là gì? Cách săn deal Flash Sale trên Shopee | Giải thích + hướng dẫn |
| 16 | `so-sanh-sale-shopee-9-9-vs-11-11` | So sánh Shopee 9.9 vs 11.11 — Đợt nào giảm giá nhiều hơn? | So sánh |

### Mẹo hay / Tips (4 bài)

| # | Slug | Tiêu đề đề xuất | Search intent |
|---|---|---|---|
| 17 | `meo-mua-sam-shopee-tiet-kiem` | 10+ mẹo mua sắm Shopee tiết kiệm — Không phải ai cũng biết | Tips |
| 18 | `cach-xep-don-shopee-tiet-kiem-ship` | Cách xếp đơn Shopee để tiết kiệm phí ship tối đa | Tips + công cụ |
| 19 | `voucher-toan-san-vs-voucher-shop` | Voucher toàn sàn vs voucher shop — Khi nào dùng loại nào? | So sánh |
| 20 | `danh-gia-voucher-hieu-qua` | [Đã có] Voucher nào thực sự tiết kiệm? | Đánh giá / phân tích |

---

## 6. PHÂN LOẠI PAGE: TRAFFIC vs CHUYỂN ĐỔI

### 🔥 Traffic Pages (Top of Funnel)
Những page này có search volume, rank được, không cần user dùng tool ngay.

| Page | Keyword target | Công việc chính |
|---|---|---|
| `/deals/shopee` | "voucher shopee", "deal shopee" | List deal + internal link |
| `/deals/hot` | "deal hot hom nay", "coupon hot" | List deal nổi bật |
| `/deals/sale-11-11` | "shopee 11.11", "sale 11/11" | Event hub + deals |
| `/blog/lich-sale-shopee-2026` | "lich sale shopee 2026" | Thông tin thường xuyên được tìm |
| `/blog/cach-su-dung-voucher-shopee` | "cach su dung voucher shopee" | Hướng dẫn — keyword ổn định |
| `/deals/dien-thoai` | "voucher dien thoai shopee" | Category hub |
| `/blog/voucher-shopee-la-gi` | "voucher shopee la gi" | High volume, low competition |

### 🎯 Conversion Pages (Bottom of Funnel)
Những page này chuyển đổi user thành người dùng tool.

| Page | Công việc chính |
|---|---|
| `/home` | **Điểm chuyển đổi chính** — Tool tra cứu |
| `/deals/expiring` | **Urgency conversion** — "sắp hết hạn" thúc đẩy hành động |
| `/deals/[category]` | **Category conversion** — User đã có intent, chuyển sang tool |
| `/blog/[slug]` (mỗi bài) | **In-article CTA** — Link về /home hoặc /deals/[cat] |

### 🔗 Support Pages (Middle of Funnel)
Hỗ trợ SEO + xây trust.

| Page | Vai trò |
|---|---|
| `/info/about` | Trust signal, giới thiệu dự án |
| `/blog/hoi-dap-voucher-shopee` | FAQ — bắt featured snippets |
| `/blog/confidence-score-la-gi` | Giải thích tính năng — xây trust |
| `/deals/expiring` | Cũng là support page — urgency tự nhiên |

---

## 7. SITEMAP ĐỀ XUẤT ĐẦY ĐỦ

```xml
<!-- Priority 1.0 -->
<url>
  <loc>https://voucherfinder.app/home</loc>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
</url>

<!-- Priority 0.9 — Deals hub -->
<url>
  <loc>https://voucherfinder.app/deals</loc>
  <changefreq>hourly</changefreq>
  <priority>0.9</priority>
</url>

<!-- Priority 0.8 — Hot / Expiring / Platform -->
<url>
  <loc>https://voucherfinder.app/deals/hot</loc>
  <changefreq>hourly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/expiring</loc>
  <changefreq>hourly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/shopee</loc>
  <changefreq>hourly</changefreq>
  <priority>0.8</priority>
</url>

<!-- Priority 0.7 — Top categories -->
<url>
  <loc>https://voucherfinder.app/deals/dien-thoai</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/laptop</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/thoi-trang-nam</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/thoi-trang-nu</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/my-pham</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/me-be</loc>
  <changefreq>daily</changefreq>
  <priority>0.7</priority>
</url>

<!-- Priority 0.7 — Blog hub + top posts -->
<url>
  <loc>https://voucherfinder.app/blog</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/lich-sale-shopee-2026</loc>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/voucher-shopee-la-gi</loc>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/cach-su-dung-voucher-shopee</loc>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>

<!-- Priority 0.6 — Secondary categories + posts -->
<url>
  <loc>https://voucherfinder.app/deals/nha-cua</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/the-thao</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/sach</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/may-tinh-bang</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/tui-xach</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
</url>

<!-- Event pages -->
<url>
  <loc>https://voucherfinder.app/deals/sale-11-11</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/sale-9-9</loc>
  <changefreq>weekly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/sale-12-12</loc>
  <changefreq>weekly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/deals/sale-flash-sale</loc>
  <changefreq>daily</changefreq>
  <priority>0.6</priority>
</url>

<!-- Blog posts -->
<url>
  <loc>https://voucherfinder.app/blog/meo-mua-sam-shopee-tiet-kiem</loc>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/shopee-11-11-2026</loc>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/cach-xep-don-shopee-tiet-kiem-ship</loc>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/so-sanh-sale-shopee-9-9-vs-11-11</loc>
  <changefreq>monthly</changefreq>
  <priority>0.6</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/tim-voucher-shopee-o-dau</loc>
  <changefreq>monthly</changefreq>
  <priority>0.5</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/voucher-toan-san-vs-voucher-shop</loc>
  <changefreq>monthly</changefreq>
  <priority>0.5</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/flash-sale-la-gi</loc>
  <changefreq>monthly</changefreq>
  <priority>0.5</priority>
</url>
<url>
  <loc>https://voucherfinder.app/blog/cach-khong-mua-phai-hang-gia</loc>
  <changefreq>monthly</changefreq>
  <priority>0.5</priority>
</url>

<!-- Priority 0.5 — Info + existing posts -->
<url>
  <loc>https://voucherfinder.app/info/about</loc>
  <changefreq>monthly</changefreq>
  <priority>0.5</priority>
</url>
<url>
  <loc>https://voucherfinder.app/info/contact</loc>
  <changefreq>monthly</changefreq>
  <priority>0.4</priority>
</url>
<url>
  <loc>https://voucherfinder.app/info/privacy</loc>
  <changefreq>yearly</changefreq>
  <priority>0.3</priority>
</url>
<url>
  <loc>https://voucherfinder.app/info/terms</loc>
  <changefreq>yearly</changefreq>
  <priority>0.3</priority>
</url>
<url>
  <loc>https://voucherfinder.app/info/cookies</loc>
  <changefreq>yearly</changefreq>
  <priority>0.3</priority>
</url>
<url>
  <loc>https://voucherfinder.app/info/affiliate-disclosure</loc>
  <changefreq>yearly</changefreq>
  <priority>0.3</priority>
</url>
```

---

## 8. NEXT STEPS — THỨ TỰ THỰC HIỆN

### Giai đoạn 1: Nền tảng (Tuần 1–2)
1. **Rename `/resources` → `/blog`** — 301 redirect, cập nhật sitemap
2. **Tạo `/deals/shopee`** — Page deal Shopee (dùng query `platform=shopee`)
3. **Tạo `/deals/dien-thoai`** — Page category đầu tiên
4. **Thêm sitemap mới** — Cập nhật sitemap.ts với tất cả pages mới

### Giai đoạn 2: Mở rộng deals (Tuần 3–4)
5. Tạo 5 category pages: `laptop`, `thoi-trang-nam`, `thoi-trang-nu`, `my-pham`, `me-be`
6. Tạo `/deals/sale-11-11` (chuẩn bị trước tháng 11)
7. Tạo `/deals/hot` + `/deals/expiring` với nội dung thực (đã có page, cần data thật)

### Giai đoạn 3: Content (Tuần 5–8)
8. Viết 10 bài blog Tier 1
9. Internal linking từ blog posts → deals pages + /home
10. Schema markup cho tất cả pages (Article, FAQPage, BreadcrumbList)

### Giai đoạn 4: Tối ưu (Tuần 9–12)
11. Backlink building cho các page có potential
12. Cải thiện Core Web Vitals nếu cần
13. Monitoring rankings + conversions

---

## 9. LƯU Ý QUAN TRỌNG

### Không làm content rác
- Mỗi page phải có **real value**: deal thật, hướng dẫn thật, thông tin thật
- Không tạo page với chỉ 200 từ và link ra
- Cập nhật deal pages bằng data thật từ DB (không hardcode)

### Cân bằng giữa SEO và sản phẩm
- Tool tra cứu (`/home`) vẫn là core — không thay thế
- Deal pages = discovery layer, không phải landing page chính
- Mỗi blog post phải có CTA rõ ràng về tool

### Dynamic vs Static
- `/deals/dien-thoai` → **Static shell + dynamic data** (SSG với ISR 1h)
- `/blog/[slug]` → **Static** (rebuild khi publish)
- `/deals/hot`, `/deals/expiring` → **SSR hoặc ISR ngắn** (dữ liệu thay đổi liên tục)

### Redirect strategy
- Rename `/resources` → `/blog`: tạo 301 redirect cho tất cả sub-paths
- Không xóa URL cũ — always redirect

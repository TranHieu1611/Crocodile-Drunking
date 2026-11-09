# PROMPT — Build web game "RĂNG CÁ SẤU" (game nhậu 8 người)

> Copy toàn bộ phần dưới vào Claude Code, kèm file `croc_cards.json` trong cùng thư mục.

---

Hãy build cho tôi một **web app game nhậu** tên **"Răng Cá Sấu"**, giao diện **tiếng Việt**, chơi trên **1 điện thoại đặt giữa bàn** (chuyền tay). Dữ liệu thẻ thử thách nằm ở `croc_cards.json` trong thư mục này.

## 1. Yêu cầu kỹ thuật

- **Vite + vanilla TypeScript** (không framework UI nặng). Build ra thư mục `dist/` là site tĩnh, deploy được lên Netlify/Vercel/GitHub Pages.
- Đồng thời tạo lệnh build ra **1 file `dist-single/index.html` duy nhất** (inline JS/CSS/JSON, dùng `vite-plugin-singlefile`) để mở offline bằng điện thoại.
- **PWA**: manifest + service worker để "Thêm vào màn hình chính" và chơi offline.
- **Mobile-first**: tối ưu 360–430px dọc; desktop thì hiển thị khung điện thoại ở giữa. Không cuộn ngang. Nút bấm ≥ 48px.
- Font: **Baloo 2** (800, tiêu đề) + **Be Vietnam Pro** (400/600/800, nội dung) — bundle font cục bộ để chạy offline; bắt buộc hiển thị đúng dấu tiếng Việt.
- Âm thanh tạo bằng **Web Audio API** (không cần file mp3), có nút tắt. Rung bằng `navigator.vibrate` nếu có.
- Lưu ván đang chơi vào `localStorage` (bọc try/catch). Mở lại → hỏi "Chơi tiếp ván cũ?".
- Tất cả tỉ lệ/hằng số gom vào `src/config.ts` để dễ chỉnh.
- Tôn trọng `prefers-reduced-motion`.

## 2. Luật chơi

### 2.1 Thiết lập ván
- 2–12 người chơi (tối ưu **8**). Mỗi người: tên + màu (tự gán, đổi được). Thứ tự nhập = thứ tự chỗ ngồi (để biết trái/phải).
- Mỗi người có công tắc **"OK thử thách cặp"** (mặc định TẮT).
- Cài đặt chung:
  | Cài đặt | Mặc định |
  |---|---|
  | Thử thách 18+ (sexy) | BẬT |
  | Cho phép thẻ liên quan người ngoài (gọi/nhắn/đăng) | BẬT |
  | Cho phép thẻ điện thoại riêng tư | BẬT |
  | Cược nhanh | BẬT |
  | Đồng hồ chọn răng | 5 giây |
  | Hàm Trùm (mỗi 3 hàm) | BẬT |
  | Âm thanh | BẬT |
  | Chế độ "nước lọc" cho từng người (lái xe) | TẮT |

### 2.2 Một "Hàm" (1 vòng)
- Cá sấu có **12 răng**. Đầu mỗi hàm app giấu ngẫu nhiên **4 răng độc**:
  - 🔴 **2 Răng Uống**
  - 🟣 **1 Răng Cực Khó**
  - 🟡 **1 Răng Uống Cùng**
- Lặp các lượt:
  1. Bấm **"Quay chọn người"** → hiệu ứng nhấp nháy chạy qua các avatar ~1 giây rồi dừng ở **1 người random** (không trùng người vừa chơi lượt trước).
  2. (Nếu bật) Hiện nhắc **Cược nhanh**: "Ai đoán {A} sẽ bị gặm thì giơ tay! Đoán sai uống 1 ngụm." — chỉ là nhắc, app không cần ghi nhận ai cược.
  3. Người được chọn có **5 giây** để bấm 1 răng (vòng đếm ngược). Hết giờ → app tự chọn random 1 răng còn lại + người đó **uống thêm 1 ngụm** vì chậm.
  4. Xử lý theo loại răng (2.3).
- **Hàm kết thúc khi cả 4 răng độc đã bị dính** → màn Tổng kết hàm → bấm "Hàm tiếp theo" xáo lại vị trí răng độc.
- Thanh trên cùng luôn hiện: số hàm, **"Răng độc còn x/4"**, **"Nguy cơ bị gặm %"** = răng độc còn lại / răng còn lại.

### 2.3 Các loại răng
**Răng an toàn:** răng lún xuống, chuyển màu xám rêu, hiện 1 câu chọc ngẫu nhiên trong `safe_quips`. Quay người tiếp theo.

**🔴 Răng Uống (x2):**
- Hàm sập + màn đỏ "BỊ GẶM!". Người dính bấm **QUAY** vòng quay may mắn.
- Vòng quay có ô **GOD SAVE = 10%** (cung 36°), phần còn lại "UỐNG". Kết quả quyết định bằng `Math.random()` theo tỉ lệ, rồi tính góc dừng tương ứng để kim chỉ đúng ô. Quay 2.5–3 giây, tiếng tick, giảm tốc mượt.
- GOD SAVE → confetti vàng, "Thoát nạn". Ngược lại → rung + flash đỏ, "Uống 1 ly".

**🟣 Răng Cực Khó (x1):**
- Màn tím "BỊ GẶM!" + rút 1 thẻ từ deck `hard` (lọc theo mục 2.4). Hiển thị đồng hồ theo `seconds` của thẻ (có nút Bắt đầu đếm).
- Nút: **"Làm được rồi"** (cả bàn công nhận) / **"Chịu thua, uống 2 ly"**.

**🟡 Răng Uống Cùng (x1):**
- Người dính **{A} chắc chắn uống 1 ly**.
- App random **1 người bị kéo {B}** (≠ {A}, thỏa điều kiện lọc của thẻ).
- Rút 1 thẻ từ deck `buddy`: **{B} làm thử thách cùng/với {A}**.
- Cả bàn bỏ phiếu: **"Cả nhà OK → {B} thoát"** / **"Không OK → {B} uống cùng {A}"**.

### 2.4 Lọc thẻ (bắt buộc đúng)
- Thay `{A}`, `{B}`, `{L}`, `{R}` bằng tên thật (L/R = người ngồi trái/phải {A}), tô màu theo màu người chơi.
- Thẻ tag `sexy` chỉ rút khi bật 18+.
- Thẻ tag `outside`/`phone` chỉ rút khi công tắc tương ứng bật.
- Thẻ tag `couple`: **mọi người được nhắc tới trong thẻ** ({A} và {B}/{L}/{R} nếu có) đều phải bật "OK thử thách cặp". Với thẻ `hard` có `couple` mà không mặc định {L}/{R} (ví dụ "một người cả bàn chọn"), chỉ cần {A} bật OK cặp và hiển thị gợi ý "chỉ chọn người đã bật OK cặp".
- Với Răng Uống Cùng: chọn thẻ trước hay chọn {B} trước đều được, miễn kết quả thỏa lọc; nếu không có tổ hợp hợp lệ → dùng thẻ không có tag `couple`.
- Thẻ `boss: true` chỉ xuất hiện ở **Hàm Trùm** (hàm 3, 6, 9…). Ở Hàm Trùm ưu tiên thẻ boss (nếu còn thẻ hợp lệ), giao diện hàm đổi tông đỏ sậm + banner "HÀM TRÙM".
- Không lặp thẻ cho tới khi hết deck, rồi xáo lại.
- Màn **"Thêm thẻ của hội"**: thêm thẻ tự viết (deck, nội dung, tag, số giây), lưu localStorage, gộp vào deck.

### 2.5 Chế độ nước lọc
Người bật "nước lọc": mọi chữ "uống X ly/ngụm" hiển thị thành "uống X ly nước lọc".

## 3. Màn hình

1. **Thiết lập**: tiêu đề "Răng Cá Sấu", lưới người chơi 2 cột (avatar tròn màu + tên + công tắc OK cặp), nút "+ Thêm người chơi", thẻ thông tin "4 răng độc mỗi hàm: Uống ×2 (God Save 10%), Cực khó ×1 (thua 2 ly), Uống cùng ×1 (kéo 1 người)", danh sách công tắc, nút lớn **"Mở miệng cá sấu"**. Có link "Luật chơi" (4 slide ngắn).
2. **Màn chơi**: header (Hàm N · Răng độc còn x/4 · Nguy cơ %), thanh 8 avatar (người được chọn phát sáng viền xanh chanh + phóng to), khu "Quay chọn người" / "Cá sấu gọi tên {A}, chọn 1 răng!" + đồng hồ, **hàm cá sấu** chiếm phần lớn màn hình, dòng thông báo, chú thích màu 3 loại răng, menu (tạm dừng, sửa người chơi, thêm thẻ, âm thanh, kết thúc ván).
3. **Răng Uống**: overlay đỏ, vòng quay God Save, kết quả, nút Tiếp tục.
4. **Răng Cực Khó**: overlay tím, thẻ kem lớn, đồng hồ, 2 nút.
5. **Răng Uống Cùng**: overlay vàng, 2 avatar {A} → {B}, thẻ cho {B}, 2 nút bỏ phiếu.
6. **Tổng kết hàm**: "x/8 người đã uống" (số lớn + thanh %), danh sách từng người: lý do (Răng Uống / God Save / Cực khó thua / Bị kéo uống cùng / Chậm tay…) + số ly, nhóm "Sống sót", nút "Hàm tiếp theo".
7. **Tổng kết buổi** (khi bấm Kết thúc ván): danh hiệu
   - 🍺 Mồi Ngon Của Cá Sấu (bị gặm nhiều nhất)
   - 🙏 Được Trời Thương (nhiều God Save nhất)
   - 🔥 Liều Mạng (làm được nhiều Thử thách Cực khó nhất)
   - 🧲 Nam Châm Xui (bị kéo uống cùng nhiều nhất)
   - 🛡️ Bất Tử (ít bị gặm nhất)
   + bảng thống kê từng người, nút "Ván mới (giữ người chơi)".

## 4. Thiết kế hình ảnh

- **Tông "đầm lầy về đêm"**:
  - Nền `#0E1A12`, bề mặt `#16261B`, viền `#2A3F2F`, chữ `#ECF3E6`, chữ phụ `#9DB3A0`
  - Nhấn chính (xanh chanh) `#B8FF3C` — chữ trên nền này dùng `#0E1A12`
  - Răng Uống `#FF5A4E` (overlay nền `#280408`), Cực Khó `#C084FC` (nền `#1C0628`), Uống Cùng `#FFC93C` (nền `#241802`)
  - Thẻ thử thách: nền kem `#FFF6E8`, chữ `#2A1206`, viền phát sáng theo màu loại răng
  - Cá sấu: hàm trên `#3F8F4F`, hàm dưới `#2C6B3A`, lòng miệng `#5E1530`, lưỡi `#A8355A`, răng `#F4EBD0`
- **Hàm cá sấu** vẽ bằng CSS/SVG (không dùng ảnh): hàm trên có 2 mắt lồi (lòng trắng + đồng tử dọc), lỗ mũi; hàm dưới hình chữ U, 12 răng xếp theo đường cong chữ U, mỗi răng xoay hướng vào tâm miệng. Răng là `<button>` có `aria-label="Răng số n"`.
- **Icon**: SVG nét (stroke), không dùng emoji trong UI chính (emoji chỉ ok trong danh hiệu tổng kết).
- Không dùng gradient wash kiểu AI, không card viền trái.

## 5. Hiệu ứng (quan trọng — game phải "đã")

| Khoảnh khắc | Hiệu ứng |
|---|---|
| Quay chọn người | Viền sáng nhảy qua các avatar, nhanh rồi chậm dần, tiếng tick |
| Mắt cá sấu | Đồng tử nhìn theo răng đang được hover/nhấn; chớp mắt ngẫu nhiên |
| Bấm răng an toàn | Răng lún xuống (scale + translate), tiếng "cộc", cá sấu hơi rung |
| Bị gặm | Hàm trên **sập xuống** đóng miệng (~250ms), tiếng "RẮC", rung màn hình, flash màu theo loại răng, rung điện thoại 300ms |
| Nguy cơ ≥ 50% | Con số đỏ nhấp nháy nhẹ, nhịp tim nền (âm trầm) |
| God Save | Confetti vàng + tiếng "ting" |
| Hàm Trùm | Banner trượt vào, nền đổi đỏ sậm, cá sấu có "sẹo" |
| Hết hàm | Cá sấu ợ một cái (animation phồng má) |

## 6. Cấu trúc code gợi ý

```
src/
  main.ts          // khởi tạo, router màn hình
  config.ts        // hằng số: số răng, số răng độc theo loại, GOD_SAVE=0.10, timer, boss interval
  state.ts         // kiểu dữ liệu GameState, lưu/khôi phục localStorage
  engine.ts        // logic thuần: tạo hàm, chọn người, xử lý răng, lọc & rút thẻ, thống kê (KHÔNG đụng DOM)
  cards.ts         // load croc_cards.json, filter, thay placeholder
  audio.ts         // Web Audio: tick, crunch, ting, buzz, heartbeat
  ui/              // từng màn hình + component cá sấu, vòng quay, overlay
  styles/
croc_cards.json
```
- Viết **unit test (Vitest)** cho `engine.ts`: mỗi hàm luôn đúng 4 răng độc (2/1/1); hàm kết thúc khi đủ 4 răng độc; không chọn trùng người liên tiếp; lọc `couple`/`sexy`/`outside`/`phone` đúng; God Save xấp xỉ 10% trên 10.000 lần mô phỏng; {B} ≠ {A}.

## 7. Tiêu chí hoàn thành

1. Nhập 8 người và vào chơi trong < 1 phút.
2. Một hàm chạy trọn: quay người → chọn răng → xử lý → … → đủ 4 răng độc → Tổng kết hàm → hàm mới.
3. Vòng quay God Save đúng 10% và kim dừng đúng ô kết quả.
4. Thẻ `couple` **không bao giờ** nhắm vào người chưa bật OK cặp; thẻ bị tắt bởi công tắc không bao giờ xuất hiện.
5. Hết 5 giây tự chọn răng + phạt chậm tay.
6. Hàm Trùm xuất hiện mỗi 3 hàm với thẻ boss.
7. Tải lại trang khôi phục đúng ván.
8. Đẹp và không vỡ layout trên iPhone SE (375×667) và màn 430×932; chạy mượt 60fps trên điện thoại tầm trung.
9. `npm run build` ra site tĩnh và `npm run build:single` ra 1 file HTML chạy offline.

Làm theo thứ tự: engine + test → màn chơi + cá sấu → 3 overlay → setup → tổng kết → hiệu ứng/âm thanh → PWA. Sau mỗi bước chạy thử và báo lại.

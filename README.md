# Crocodile-Drunking

Hello

**Răng Cá Sấu** — game nhậu chuyền tay cho 2–12 người (tối ưu 8) trên một điện thoại đặt giữa bàn. Giao diện tiếng Việt, chạy offline.

## Cách chơi

- Cá sấu có 12 răng, mỗi hàm giấu 7 răng độc: **Uống ×2** (vòng quay God Save 10%), **Cực khó ×1** (thua uống 2 ly), **Uống cùng ×1** (kéo thêm 1 người), **Vòng quay ×1** (quay ra mình uống hoặc cả bàn cùng uống), **Hít đất ×1** (quay 1–5 cái), **Squat ×1** (quay 4–10 cái; không nổi thì uống 1 ly).
- Bấm **Quay chọn người** → người được gọi tên có 5 giây chọn 1 răng. Chậm tay thì app chọn hộ và phạt 1 ngụm.
- Dính đủ 7 răng độc thì hết hàm. Cứ 3 hàm có 1 **Hàm Trùm** với thẻ nặng đô hơn.
- Thẻ đụng chạm chỉ rút cho người bật **OK cặp**; ai lái xe thì bật **nước lọc**. Uống có trách nhiệm!

## Chạy & build

```bash
npm install
npm run dev           # chạy thử
npm test              # unit test cho engine
npm run build         # site tĩnh ở dist/ (PWA, deploy Netlify/Vercel/GitHub Pages)
npm run build:single  # 1 file dist-single/index.html, mở offline trên điện thoại
```

Thẻ thử thách nằm trong `croc_cards.json`; có thể thêm thẻ riêng ngay trong app (**Thêm thẻ của hội**). Mọi tỉ lệ/hằng số ở `src/config.ts`.

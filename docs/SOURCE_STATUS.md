# Trạng thái source khi công khai

Ngày kiểm tra: 03/11/2026. Phạm vi: nhập source V1.2 và bổ sung tài liệu, không nâng cấp gameplay trong lần này.

## Kiểm tra đã chạy

| Kiểm tra | Kết quả |
| --- | --- |
| Đối chiếu từng file với ZIP gốc | PASS — 42 file giữ nguyên byte, có SHA-256 |
| Cú pháp JavaScript bằng Node.js | PASS — 13 file JS và 1 script inline |
| Script/stylesheet/tài nguyên khai báo trực tiếp trong HTML | PASS — 25 đường dẫn local tồn tại |
| Quét một số mẫu credential phổ biến trong 31 file văn bản gốc | Không phát hiện mẫu khớp; không phải bảo đảm phát hiện mọi secret |
| Chạy gameplay/WebGL trên trình duyệt | Chưa thực hiện trong đợt nhập source |
| Kiểm tra chất lượng đồ họa, animation và công thức nghiệp vụ đầu-cuối | Chưa nghiệm thu |

Lệnh tái kiểm tra: `python3 scripts/audit_source.py` (Windows: `py scripts/audit_source.py`). Báo cáo JSON của đợt kiểm tra nằm tại [STATIC_CHECK_RESULT.json](STATIC_CHECK_RESULT.json).

## Khoảng trống cần xử lý

- CDN Three.js r159 và addon vẫn được tải từ mạng. Thư mục vendor/three trong ZIP trống nên Git không lưu chúng; bản public không bỏ mất file thư viện nào có trong ZIP.
- Chưa có model sản xuất `assets/characters/owner_m.glb` và `owner_f.glb` trong bản gốc. Không ghi nhầm “đã có nhân vật final”.
- Nhiều asset dự phòng là URL mạng; khả năng truy cập và giấy phép từng file phải được kiểm tra lại trước khi đóng gói offline/thương mại.
- Profile/PIN/save là localStorage, không có tài khoản máy chủ hoặc đồng bộ nhiều máy. PIN local không phải cơ chế bảo vệ cho tài khoản trực tuyến.
- Không có package.json hoặc build pipeline trong ZIP gốc. README hướng dẫn phục vụ source tĩnh qua HTTP local.
- Chưa có bằng chứng URL chơi game công khai. Repo source, link ZIP và link chơi trực tuyến là ba loại khác nhau.

## Nội dung bổ sung trong lần công khai

README, kế hoạch theo giai đoạn, danh mục skill/repo, commit khảo sát upstream, nguồn gốc/checksum file, ghi chú quyền sử dụng, hướng dẫn tiếp tục dự án và script kiểm tra tĩnh. Không sao chép hay tự động cài skill/repo bên ngoài vào runtime.

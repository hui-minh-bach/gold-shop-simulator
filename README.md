# Gold Shop Simulator — Trải nghiệm làm chủ tiệm vàng

Game mô phỏng vận hành tiệm vàng Việt Nam, bắt đầu với 10 tỷ đồng vốn. Kho mã này nhập source **V1.2 Character Motion & Accuracy** và bổ sung kế hoạch phát triển cùng danh mục skill/repo đã đối chiếu ngày **03/11/2026**.

**Trạng thái: prototype.** Việc công khai source không đồng nghĩa game đã hoàn thành hoặc có website chơi trực tuyến. Đợt nhập source này giữ nguyên toàn bộ file game gốc, không tuyên bố nâng cấp đồ họa hay nghiệm thu nghiệp vụ.

## Chạy bản hiện tại

1. Tải source ZIP từ GitHub hoặc clone repository, rồi giải nén.
2. Mở terminal trong thư mục chứa `index.html`.
3. Trên Windows có Python, chạy `py -m http.server 8080`; trên macOS/Linux chạy `python3 -m http.server 8080`.
4. Truy cập `http://localhost:8080`, tạo hồ sơ local, hoàn tất khởi nghiệp và chọn cửa hàng 3D.

Source cũ hướng dẫn mở trực tiếp `index.html`. Dùng HTTP local thuận tiện hơn cho việc tải module và mô hình. **Cần Internet** để tải Three.js r159, các module từ CDN và model dự phòng; gói hiện tại chưa phải bản offline đầy đủ.

Hồ sơ, PIN và tiến trình lưu trong trình duyệt. Đây là cơ chế hồ sơ chơi local, không phải hệ thống xác thực máy chủ. Không sử dụng PIN quan trọng hoặc dữ liệu khách hàng thật. Dữ liệu có thể mất nếu xóa dữ liệu trình duyệt; tính năng xuất/nhập save có trong giao diện.

## Tài liệu dự án

| Tài liệu | Mục đích |
| --- | --- |
| [Kế hoạch dự án](docs/PROJECT_PLAN_VI.md) | Mục tiêu, việc cần làm theo giai đoạn và điều kiện nghiệm thu |
| [Skill và repo](docs/SKILLS_AND_REPOS.md) | Công cụ tương ứng với từng việc, liên kết nguồn và giới hạn tương thích |
| [Trạng thái source](docs/SOURCE_STATUS.md) | Kết quả kiểm tra gói hiện tại và những phần còn thiếu |
| [Danh mục nguồn đã kiểm tra](docs/repositories-reviewed.json) | Repo, giấy phép nhận diện được và commit đối chiếu |
| [Nguồn gốc file](docs/SOURCE_PROVENANCE.json) | SHA-256 của gói nhập và từng file gốc |
| [Thông báo bên thứ ba](THIRD_PARTY_NOTICES.txt) | Nguồn thư viện và asset đã được bản cũ ghi nhận |

## Kiểm tra source

Yêu cầu Python 3 và Node.js. Chạy:

```bash
python3 scripts/audit_source.py
```

Trên Windows có thể dùng `py scripts/audit_source.py`. Kiểm tra này xác minh file gốc, cú pháp JavaScript, tài nguyên HTML nội bộ và một số mẫu credential phổ biến; **không thay thế kiểm thử gameplay/WebGL/thiết bị**.

## Phạm vi công khai và giấy phép

Repository công khai để xem và phát triển source theo yêu cầu chủ dự án. Gói gốc không có giấy phép tổng thể cho toàn bộ game; đợt này không tự cấp lại giấy phép cho game hoặc asset. Giấy phép từng thư viện, skill và asset vẫn thuộc nguồn tương ứng. Xem [ghi chú quyền sử dụng](docs/RIGHTS_AND_ASSETS.md).

# Kế hoạch Gold Shop Simulator

Cập nhật: 03/11/2026. Mốc xuất phát: source V1.2 nhập từ gói đã bàn giao ngày 29/09/2026.

## 1. Mục tiêu đã thống nhất

Người chơi trải nghiệm làm chủ tiệm vàng Việt Nam: tạo hồ sơ, đặt tên chủ và tiệm, phân bổ **10 tỷ đồng** vốn, khai trương, mua/bán/đổi vàng, nhận cầm, quản lý hàng tồn và tiền, trả chi phí rồi khóa sổ. Hướng dẫn bằng chữ và giọng nói giúp người mới hiểu quyết định của mình.

Không gian hướng tới cửa hàng 3D sử dụng Three.js/WebGL, vật liệu PBR và nhân vật có rig/animation. Hình ảnh cần được đánh giá từ cảnh đang chơi, không lấy ảnh concept làm bằng chứng chất lượng game.

## 2. Hiện trạng được đọc từ source

- HTML/CSS/JavaScript thuần, nhiều lớp nâng cấp từ các phiên bản cũ cùng nạp qua `index.html`.
- Three.js **0.159.0** tải từ CDN; không có package manifest hay build pipeline npm trong gói gốc.
- Hồ sơ local và lưu game bằng trình duyệt; không có backend xác thực/đồng bộ.
- Có code khởi nghiệp, kho/SKU, giao dịch, cầm đồ, báo cáo và cửa hàng 3D. Chưa nghiệm thu luồng chơi đầu-cuối trong đợt công khai này.
- `owner_m.glb` và `owner_f.glb` chưa có trong gói; runtime có đường dẫn model mạng dự phòng và hình khối dự phòng. Các thư mục `vendor/three` trong ZIP trống.
- Mức thu cầm cấu hình sẵn trong code: 3%, 2,5%, 2% theo nhóm tiền. Mức 3%/tháng là cơ sở mô phỏng đã bàn; cần mô tả rõ cấu hình và đối chiếu nghiệp vụ trước khi chốt gameplay.

## 3. Lộ trình và điều kiện hoàn thành

| Giai đoạn | Công việc cụ thể | Skill/repo gắn vào | Điều kiện nghiệm thu |
| --- | --- | --- | --- |
| P0 — Lưu source và kế hoạch | Nhập đúng V1.2; giữ nguồn gốc, asset và thông báo bên thứ ba; công khai GitHub; lập backlog | GitHub, danh mục repo đã kiểm tra | Repo public có source đọc được, tài liệu và hash file; xác nhận commit đã lên main |
| P1 — Chạy ổn định | Dựng HTTP local; đo lỗi console/tải tài nguyên; kiểm tra fallback; gom và khóa phiên bản dependency; thiết lập test có seed | `threejs-debug-profiler`, `threejs-qa-release`, Three.js r159, Playwright | Tạo hồ sơ → khởi nghiệp → vào 3D hoạt động; CDN/model lỗi không để màn hình trắng; lưu và tải lại tiến trình |
| P2 — Nghiệp vụ | Đối chiếu mua/bán/đổi, tuổi vàng, trọng lượng, tiền công và cầm đồ; tách tiền mặt, hàng tồn, dư nợ và lợi nhuận | `threejs-gameplay-systems`, kiểm thử nghiệp vụ độc lập | Ca bán, thu mua, đổi bù, cầm, thu kỳ, trả gốc, khóa sổ có kết quả đối chiếu; không ghi tiền vay hoặc trả gốc thành doanh thu |
| P3 — Cửa hàng và nhân vật | Chốt một cảnh đại diện; chủ nam/nữ, khách/nhân viên; rig, Idle/Walk/Talk, chuyển động và tương tác quầy | `threejs-aaa-graphics-builder`, `threejs-animation`, glTF-Transform, glTF-Validator | Model có nguồn/giấy phép; clip chuyển mượt; đứng/cân/nhận vàng hợp lý; ảnh và video từ runtime; không dùng mannequin bị từ chối làm model final |
| P4 — Đường đi và camera | Kiểm tra A* đang có; sửa kẹt quầy, xuyên tường, cắt góc; cân nhắc navmesh khi mặt bằng phức tạp | `threejs-gameplay-systems`, `threejs-interaction`, `three-pathfinding` ở nhánh thử nghiệm | Chủ/khách tới đúng quầy; không tương tác từ xa; không mắc kẹt trong chuỗi khách; đổi layout phải kiểm tra lại đường đi |
| P5 — Giao diện và hướng dẫn | HUD gọn, số tiền đủ chữ số; chữ tiếng Việt; điều khiển chuột/chạm; hướng dẫn chữ và giọng | `threejs-game-ui-designer`, `frontend-design`, Playwright | Không tràn/cắt số tiền; rõ bước tiếp theo; kiểm tra desktop và mobile; có điều khiển bật/tắt âm thanh |
| P6 — Phát hành web | Kiểm thử một ca chơi đầy đủ, hồi phục save, tài nguyên lỗi và hiệu năng; sau đó triển khai hosting và kiểm tra URL thật | `threejs-qa-release`, `webapp-testing`, Playwright; Playwright MCP tùy môi trường | Có link chơi thật đã xác minh; không nhầm link source/ZIP với link game; báo cáo test ghi thiết bị, trạng thái và giới hạn |

P0 là phạm vi thực hiện của đợt yêu cầu công khai source và bổ sung kế hoạch. P1–P6 là backlog phát triển, không được đánh dấu xong chỉ vì đã tìm được skill/repo.

## 4. Nguyên tắc triển khai

1. Nâng trực tiếp từ source đang có, giữ luồng chơi và dữ liệu đã hoạt động. Chưa có lý do bắt buộc chuyển sang React/R3F hoặc engine khác.
2. Bắt đầu bằng một vòng chơi hoàn chỉnh và một cảnh đại diện trước khi mở rộng nội dung.
3. Skill CloudAI-X hiện nhắm r186. Source r159 phải dùng API r159; nâng engine là một thay đổi riêng, có kiểm thử và khả năng quay lại.
4. Không tự động chạy script cài đặt trong repo được giới thiệu. Tìm và gắn vào kế hoạch không đồng nghĩa đã cài, tích hợp hay cấp quyền API.
5. Asset sản xuất phải có nguồn, giấy phép, kích thước và kết quả kiểm tra. Dịch vụ sinh 3D/ảnh/giọng có phí chỉ được dùng khi đã xác định công cụ và quyền sử dụng phù hợp.
6. Mỗi mốc lưu checkpoint: commit, phần đã chạy thử, lỗi còn lại, ảnh/video bằng chứng và việc tiếp theo.

## 5. Kịch bản nghiệm thu trọng tâm

- Hồ sơ mới, tên chủ/tiệm, phân bổ vốn không vượt 10 tỷ, khai trương thành công.
- Một khách mua, một khách bán/đổi, một hợp đồng cầm; cập nhật tiền/hàng/dư nợ đúng một lần.
- Khoản thu cầm = gốc × mức thu tháng × số ngày / 30 theo quy tắc mô phỏng đang chốt; làm tròn và kỳ hạn có ca đối chiếu riêng.
- Thu kỳ ghi nhận đúng phần thu; hoàn gốc giảm dư nợ; mua hàng chuyển tiền thành hàng tồn.
- Chủ tiệm phải tới gần khách/quầy để thao tác. Kiểm tra đường đi khi nhiều NPC.
- Lưu → tải lại → xuất → nhập save, kiểm tra cả dữ liệu sai định dạng.
- Mất CDN/model, WebGL không khả dụng, resize và mobile đều có kết quả được ghi nhận.
- Chốt nghệ thuật bằng cảnh và chuyển động thật, tách rõ chất lượng model với chất lượng runtime.

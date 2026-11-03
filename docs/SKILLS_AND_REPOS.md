# Skill và repo gắn vào kế hoạch

Đối chiếu ngày 03/11/2026 từ repository của tác giả. Commit kiểm tra nằm trong [repositories-reviewed.json](repositories-reviewed.json). Đây là danh mục có vai trò và điều kiện sử dụng, không phải danh sách đã cài vào game.

## Bộ skill ưu tiên

| Nguồn | Skill phù hợp | Áp dụng vào dự án | Lưu ý |
| --- | --- | --- | --- |
| [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) | `threejs-game-director`, `threejs-gameplay-systems` | Điều phối mốc, vòng chơi, camera, tương tác và nghiệm thu P1–P6 | MIT; giữ quy mô thay đổi, không dựng game mới đè source cũ |
| Cùng bộ trên | `threejs-aaa-graphics-builder`, `threejs-game-ui-designer` | P3/P5: vật liệu, ánh sáng, asset, HUD và bố cục | Tên skill không chứng minh game đạt chất lượng AAA; phải có cảnh chơi thật |
| Cùng bộ trên | `threejs-debug-profiler`, `threejs-qa-release` | P1/P6: lỗi màn hình trắng, tốc độ, canvas và kiểm thử bản phát hành | Công cụ chạy được tùy runtime; chưa chạy các helper của bộ này trong đợt nhập source |
| [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | `threejs-materials`, `threejs-lighting`, `threejs-textures`, `threejs-animation`, `threejs-loaders`, `threejs-performance`, `threejs-asset-pipeline` | P3/P4: tham khảo PBR, rig/clip, loader và tối ưu GLB | MIT; README nhắm r186, trong khi game r159. Đối chiếu API hoặc chỉ dùng sau một đợt migration có test |
| [anthropics/skills — frontend-design](https://github.com/anthropics/skills/tree/ca45fc496a3436251f191354091d557da31c15b5/skills/frontend-design) | `frontend-design` | P5: font tiếng Việt, phân cấp số tiền, HUD gọn và trạng thái lỗi | Xem LICENSE.txt của đúng skill, không suy giấy phép từ các thư mục khác |
| [anthropics/skills — webapp-testing](https://github.com/anthropics/skills/tree/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing) | `webapp-testing` | P1/P6: luồng tạo hồ sơ, vào 3D, lưu/tải và lỗi console | Xem LICENSE.txt của đúng skill; không dùng screenshot duy nhất để kết luận toàn bộ gameplay |

Các skill tạo model/ảnh/audio trong bộ Three.js Game Skills là lựa chọn bổ sung cho sản xuất asset sau này. Chúng có thể yêu cầu API dịch vụ ngoài; đợt này không cài hoặc gọi dịch vụ trả phí.

## Repo thư viện và công cụ

| Repo | Vai trò cụ thể | Giai đoạn | Tình trạng tích hợp |
| --- | --- | --- | --- |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | Renderer, PBR, AnimationMixer, GLTFLoader, SkeletonUtils | P1/P3 | Game đã tham chiếu **0.159.0 qua CDN**. SHA nhánh dev trong danh mục chỉ là mốc khảo sát upstream, không phải phiên bản đang chạy |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | Kiểm kê và tối ưu mesh/texture GLB trước khi phát hành | P3 | Đề xuất. Bật compression phải có decoder tương thích r159 và test lại asset |
| [KhronosGroup/glTF-Validator](https://github.com/KhronosGroup/glTF-Validator) | Kiểm tra cấu trúc, buffer, accessor và tham chiếu glTF | P3 | Đề xuất. Validator không chứng nhận đẹp, rig đúng nghiệp vụ hay animation tự nhiên |
| [donmccurdy/three-pathfinding](https://github.com/donmccurdy/three-pathfinding) | Navmesh cho cửa hàng phức tạp hơn nếu A* hiện tại không đủ | P4 | Tùy chọn, chưa thay thế A* của V1.2; cần benchmark và kiểm tra version |
| [microsoft/playwright](https://github.com/microsoft/playwright) | Test trình duyệt, input, console, save và viewport | P1/P5/P6 | Đề xuất test tự động; cần môi trường browser/WebGL phù hợp |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Agent thao tác kiểm tra giao diện thông qua MCP trong môi trường hỗ trợ | P1/P6 | Tùy chọn cho người phát triển; không phải dependency để người chơi chạy game |

## Cách sử dụng danh mục

1. Chọn việc trong PROJECT_PLAN_VI.md rồi mở đúng skill liên quan; không nạp hoặc cài tất cả chỉ vì repo tồn tại.
2. Đọc lại hướng dẫn/giấy phép ở commit đã ghi trước khi dùng code hoặc asset. Các commit khảo sát không phải lockfile dependency của game.
3. Ghi rõ thay đổi nào đã tích hợp, file nào thay đổi và bằng chứng kiểm tra; không dùng nhãn “đã có skill” thay cho kết quả.
4. Với tài liệu r186, luôn chỉ rõ khác biệt so với r159; không đưa import/API mới vào runtime cũ mà chưa test.
5. Không copy trọn các repo kỹ thuật vào source game. Danh mục này lưu liên kết và commit, giúp tránh lẫn giấy phép hoặc mang theo mã không cần thiết.

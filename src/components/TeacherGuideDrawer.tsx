import React from 'react';
import { X, BookOpen, CheckCircle2, AlertCircle, Printer } from 'lucide-react';

interface TeacherGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherGuideDrawer: React.FC<TeacherGuideDrawerProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900 font-display">
              Hướng dẫn Sư phạm & Lời dẫn Giáo viên
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
              title="In tài liệu hướng dẫn"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Target */}
          <section className="bg-sky-50/70 p-4 rounded-xl border border-sky-100">
            <h3 className="font-bold text-sky-900 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              Mục tiêu bài học (Tin học Lớp 4 - Bài 12A)
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              <li>Nhận biết công cụ đa phương tiện kết hợp hình ảnh, âm thanh, văn bản và video.</li>
              <li>Thao tác thành thạo các nút điều khiển: Phát (Play), Tạm dừng (Pause), Tua video, Điều chỉnh âm lượng.</li>
              <li>Tích hợp giáo dục địa phương TP.HCM: Bến Nhà Rồng, Dinh Độc Lập, Bưu điện TP.HCM.</li>
              <li>Rèn luyện kỹ năng làm việc nhóm, quan sát và trình bày sản phẩm học tập.</li>
            </ul>
          </section>

          {/* Activity 1 */}
          <section>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              1. Khởi động (Xem video & trả lời)
            </h3>
            <p className="text-xs text-slate-600 mb-2">Thời lượng dự kiến: 5 - 7 phút</p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800">Lời dẫn giáo viên gợi ý:</p>
              <p className="italic text-slate-600">
                &ldquo;Thầy/Cô chào cả lớp! Hôm nay chúng ta sẽ cùng du lịch qua màn ảnh nhỏ để đến với một thành phố rất thân quen và tươi đẹp. Các em hãy quan sát thật kỹ màn hình và lắng nghe âm thanh trong video để xem chúng mình sẽ ghé thăm những địa danh nào nhé!&rdquo;
              </p>
            </div>
          </section>

          {/* Activity 2 */}
          <section>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              2. Khám phá (Công cụ đa phương tiện)
            </h3>
            <p className="text-xs text-slate-600 mb-2">Thời lượng dự kiến: 10 - 12 phút</p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800">Phương pháp tổ chức:</p>
              <p className="text-slate-600">
                Cho học sinh quan sát thanh công cụ trình phát đa phương tiện. Hướng dẫn các em chơi trò chơi ghép biểu tượng với chức năng:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1">
                <li>Biểu tượng tam giác ▶: Phát video.</li>
                <li>Biểu tượng 2 vạch song song ❚❚: Tạm dừng để quan sát kỹ chi tiết.</li>
                <li>Thanh tiến trình ━●━: Biết video đang ở giây thứ mấy và tua nhanh/chậm.</li>
                <li>Chiếc loa 🔊: Tăng giảm âm thanh phù hợp với lớp học.</li>
              </ul>
            </div>
          </section>

          {/* Activity 3 */}
          <section>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              3. Luyện tập (Thực hành điều khiển thật)
            </h3>
            <p className="text-xs text-slate-600 mb-2">Thời lượng dự kiến: 12 - 15 phút</p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800">Lưu ý sư phạm:</p>
              <p className="text-slate-600">
                Hệ thống kiểm tra tương tác thực tế từ trình duyệt, học sinh phải trực tiếp nhấn Phát, Tạm dừng, Kéo âm lượng, Tua qua mốc thời gian thì mới hoàn thành từng nhiệm vụ. Giáo viên có thể mời lần lượt học sinh lên bảng tương tác thực hiện.
              </p>
            </div>
          </section>

          {/* Activity 4 */}
          <section>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              4. Vận dụng (Dự án nhóm TP.HCM)
            </h3>
            <p className="text-xs text-slate-600 mb-2">Thời lượng dự kiến: 8 - 10 phút</p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <p className="text-slate-600">
                Chia lớp thành các nhóm 4 - 6 học sinh. Mỗi nhóm chọn 1 địa danh (Bến Nhà Rồng, Dinh Độc Lập, Bưu điện TP, Chợ Bến Thành...). Sử dụng tính năng <strong>In phiếu nhiệm vụ</strong> để phát cho từng nhóm hoàn thành phiếu bài tập và chuẩn bị bài thuyết trình cho tiết học sau.
              </p>
            </div>
          </section>

          {/* Studio Notes */}
          <section className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
            <h3 className="font-bold text-amber-900 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Lưu ý khi Giáo viên sử dụng Studio tạo video
            </h3>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
              <li>Giáo viên có thể tải file Word giáo án (.docx) để trích xuất tự động kịch bản.</li>
              <li>Kiểm tra bản quyền ảnh: ưu tiên ảnh từ kho lưu trữ di tích văn hóa, bảo tàng, giấy phép mở CC BY/Public Domain.</li>
              <li>Video xuất ra định dạng WebM chuẩn HTML5, có thể lưu trữ vào bộ nhớ thiết bị hoặc tải về máy tính để dạy học ngoại tuyến.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

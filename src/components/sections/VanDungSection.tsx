import React, { useState } from 'react';
import { LANDMARKS_FOR_GROUP } from '../../data/sampleData';
import { Landmark, GroupWorksheet, AppMode } from '../../types';
import { 
  Users, 
  Printer, 
  Download, 
  Plus, 
  MapPin, 
  CheckCircle2, 
  Sparkles,
  Edit3,
  FileText,
  Share2
} from 'lucide-react';

interface VanDungSectionProps {
  mode: AppMode;
}

export const VanDungSection: React.FC<VanDungSectionProps> = ({ mode }) => {
  const [landmarks, setLandmarks] = useState<Landmark[]>(LANDMARKS_FOR_GROUP);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState<string>(LANDMARKS_FOR_GROUP[0].id);

  // Group Worksheet State
  const [worksheet, setWorksheet] = useState<GroupWorksheet>({
    groupName: 'Nhóm Khăn Quàng Đỏ',
    landmarkId: LANDMARKS_FOR_GROUP[0].id,
    landmarkName: LANDMARKS_FOR_GROUP[0].name,
    members: [
      { name: 'Nguyễn Văn An', role: 'Trưởng nhóm - Điều phối chung' },
      { name: 'Trần Thị Mai', role: 'Tìm kiếm thông tin & sách báo' },
      { name: 'Lê Hoàng Nam', role: 'Chọn hình ảnh & video minh họa' },
      { name: 'Phạm Thu Hà', role: 'Thuyết minh viên bài trình bày' },
      { name: 'Vũ Minh Khang', role: 'Thư ký - Ghi chép phiếu học tập' },
    ],
    keyFacts: 'Bến Nhà Rồng là nơi Bác Hồ ra đi tìm đường cứu nước ngày 5/6/1911. Hiện nay là Bảo tàng Hồ Chí Minh, nơi lưu giữ nhiều hiện vật quý giá.',
    presentationScript: 'Kính chào Thầy Cô và các bạn! Nhóm chúng em xin giới thiệu về Bến Nhà Rồng lịch sử. Đây là nơi Bác Hồ kính yêu đã lên con tàu ra đi tìm đường cứu nước năm 1911. Chúng em rất tự hào về thành phố mang tên Bác!',
    notes: 'Nhóm chuẩn bị thêm 3 bức ảnh tư liệu để trình chiếu trên máy chiếu của lớp.',
    completed: true,
  });

  // Modal / Form state for Teacher to Add Custom Landmark
  const [showAddLandmarkModal, setShowAddLandmarkModal] = useState<boolean>(false);
  const [newLandmarkName, setNewLandmarkName] = useState<string>('');
  const [newLandmarkLocation, setNewLandmarkLocation] = useState<string>('');
  const [newLandmarkSignificance, setNewLandmarkSignificance] = useState<string>('');
  const [newLandmarkImage, setNewLandmarkImage] = useState<string>('');

  const selectedLandmark = landmarks.find(l => l.id === selectedLandmarkId) || landmarks[0];

  const handleSelectLandmark = (lm: Landmark) => {
    setSelectedLandmarkId(lm.id);
    setWorksheet(prev => ({
      ...prev,
      landmarkId: lm.id,
      landmarkName: lm.name,
    }));
  };

  const handleMemberChange = (index: number, field: 'name' | 'role', val: string) => {
    setWorksheet(prev => {
      const updatedMembers = [...prev.members];
      updatedMembers[index] = { ...updatedMembers[index], [field]: val };
      return { ...prev, members: updatedMembers };
    });
  };

  const handleAddMember = () => {
    setWorksheet(prev => ({
      ...prev,
      members: [...prev.members, { name: '', role: 'Thành viên đóng góp ý kiến' }],
    }));
  };

  const handleAddCustomLandmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLandmarkName.trim()) return;

    const newLm: Landmark = {
      id: `custom-lm-${Date.now()}`,
      name: newLandmarkName.trim(),
      location: newLandmarkLocation.trim() || 'Thành phố Hồ Chí Minh',
      historicalSignificance: newLandmarkSignificance.trim() || 'Địa danh lịch sử văn hóa tiêu biểu.',
      suggestedPrompt: 'Tìm hiểu thông tin và hình ảnh địa danh này.',
      imageUrl: newLandmarkImage.trim() || 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Ho_Chi_Minh_City_skyline_%282022%29.jpg/800px-Ho_Chi_Minh_City_skyline_%282022%29.jpg',
      category: 'Văn hóa - Du lịch',
    };

    setLandmarks(prev => [...prev, newLm]);
    setSelectedLandmarkId(newLm.id);
    setShowAddLandmarkModal(false);
    setNewLandmarkName('');
    setNewLandmarkLocation('');
    setNewLandmarkSignificance('');
    setNewLandmarkImage('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportText = () => {
    const textContent = `PHIẾU HỌC TẬP DỰ ÁN NHÓM - BÀI 12A TIN HỌC LỚP 4
CHỦ ĐỀ: NHÓM EM KHÁM PHÁ THÀNH PHỐ HỒ CHÍ MINH
==================================================
Tên nhóm: ${worksheet.groupName}
Địa danh nhóm lựa chọn: ${worksheet.landmarkName}
Địa chỉ: ${selectedLandmark.location}

DANH SÁCH THÀNH VIÊN VÀ PHÂN CÔNG:
${worksheet.members.map((m, i) => `${i + 1}. ${m.name || '(Chưa nhập tên)'} - Vai trò: ${m.role}`).join('\n')}

THÔNG TIN TÌM HIỂU ĐƯỢC:
${worksheet.keyFacts}

LỜI GIỚI THIỆU TRÌNH BÀY (3-4 CÂU):
${worksheet.presentationScript}

GHI CHÚ / PHƯƠNG TIỆN CHUẨN BỊ:
${worksheet.notes}
==================================================
Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PhieuNhiemVu_${worksheet.groupName.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Activity Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2 text-amber-200 text-xs font-semibold uppercase tracking-wider">
            <span>Hoạt động 4</span>
            <span>·</span>
            <span>Vận dụng sáng tạo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mb-3">
            Dự án: Nhóm em khám phá Thành phố Hồ Chí Minh
          </h1>
          <p className="text-sm sm:text-base text-amber-50 leading-relaxed">
            Các nhóm hãy chọn 1 địa danh yêu thích, cùng nhau tìm kiếm hình ảnh, chuẩn bị lời giới thiệu ngắn và phân công thành viên để trình bày vào tiết học sau!
          </p>
        </div>
      </div>

      {/* Printable Sheet (Visible during Print, also rendered in interactive form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Landmark Selector Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-600" />
              Chọn địa danh nghiên cứu
            </h2>
            <button
              onClick={() => setShowAddLandmarkModal(true)}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm địa danh</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {landmarks.map(lm => {
              const isSelected = selectedLandmarkId === lm.id;
              return (
                <div
                  key={lm.id}
                  onClick={() => handleSelectLandmark(lm)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex gap-3 items-center ${
                    isSelected
                      ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/30 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <img
                    src={lm.imageUrl}
                    alt={lm.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-2xs"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback gradient if external image fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {lm.name}
                      </h3>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lm.location}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-1">
                      {lm.historicalSignificance}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Digital Interactive Worksheet (Print-ready) */}
        <div id="printable-mission-sheet" className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
                Phiếu nhiệm vụ học tập nhóm
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 font-display">
                Khám phá: {worksheet.landmarkName}
              </h2>
            </div>
            
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5"
                title="In phiếu nhiệm vụ cho cả nhóm"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>In phiếu</span>
              </button>
              <button
                onClick={handleExportText}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                title="Tải file văn bản (.txt) sao lưu"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file</span>
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                1. Tên nhóm của em:
              </label>
              <input
                type="text"
                value={worksheet.groupName}
                onChange={e => setWorksheet(prev => ({ ...prev, groupName: e.target.value }))}
                placeholder="Ví dụ: Nhóm Búp Sen Hồng, Nhóm Sao Mai..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-900 font-semibold"
              />
            </div>

            {/* Member Roles Assignment */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Phân công thành viên trong nhóm:
                </label>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="text-xs text-sky-600 hover:text-sky-800 font-medium print:hidden"
                >
                  + Thêm bạn
                </button>
              </div>
              <div className="space-y-2">
                {worksheet.members.map((member, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="w-5 text-center text-slate-400 font-mono text-xs">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={member.name}
                      onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                      placeholder="Họ và tên học sinh"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-sky-500 text-slate-800"
                    />
                    <input
                      type="text"
                      value={member.role}
                      onChange={e => handleMemberChange(idx, 'role', e.target.value)}
                      placeholder="Vai trò (Ví dụ: Thuyết minh, Tìm ảnh...)"
                      className="w-48 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-sky-500 text-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Key Facts */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                3. Những thông tin quan trọng nhóm tìm hiểu được:
              </label>
              <textarea
                rows={3}
                value={worksheet.keyFacts}
                onChange={e => setWorksheet(prev => ({ ...prev, keyFacts: e.target.value }))}
                placeholder="Ghi lại các mốc lịch sử, sự kiện gắn liền với địa danh..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-800 text-xs leading-relaxed"
              />
            </div>

            {/* Presentation Script */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                4. Lời thuyết minh / Giới thiệu ngắn khi trình chiếu trước lớp (3-4 câu):
              </label>
              <textarea
                rows={3}
                value={worksheet.presentationScript}
                onChange={e => setWorksheet(prev => ({ ...prev, presentationScript: e.target.value }))}
                placeholder="Viết lời giới thiệu truyền cảm, chào thầy cô và các bạn..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40 text-slate-800 text-xs leading-relaxed"
              />
            </div>

            {/* Multimedia Checklist */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800">
                5. Danh mục đa phương tiện nhóm sẽ sử dụng trong tiết học sau:
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-sky-600" />
                  <span>Hình ảnh tư liệu chất lượng cao</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-sky-600" />
                  <span>Đoạn video ngắn điều khiển bằng máy tính</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-sky-600" />
                  <span>Bài thuyết minh có giọng đọc trực tiếp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-sky-600" />
                  <span>Màn chiếu / Tivi của lớp học</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Landmark (For Teachers) */}
      {showAddLandmarkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Thêm địa danh lịch sử / văn hóa mới
            </h3>
            <form onSubmit={handleAddCustomLandmark} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên địa danh *
                </label>
                <input
                  type="text"
                  required
                  value={newLandmarkName}
                  onChange={e => setNewLandmarkName(e.target.value)}
                  placeholder="Ví dụ: Thảo Cầm Viên Sài Gòn"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ / Vị trí
                </label>
                <input
                  type="text"
                  value={newLandmarkLocation}
                  onChange={e => setNewLandmarkLocation(e.target.value)}
                  placeholder="Ví dụ: Số 2 Nguyễn Bỉnh Khiêm, Quận 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ý nghĩa lịch sử / Điểm nổi bật
                </label>
                <textarea
                  rows={2}
                  value={newLandmarkSignificance}
                  onChange={e => setNewLandmarkSignificance(e.target.value)}
                  placeholder="Tóm tắt ngắn gọn cho học sinh lớp 4..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn ảnh (URL hoặc để trống dùng ảnh mặc định)
                </label>
                <input
                  type="url"
                  value={newLandmarkImage}
                  onChange={e => setNewLandmarkImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLandmarkModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white"
                >
                  Lưu địa danh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

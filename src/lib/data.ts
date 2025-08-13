
export const dashboardStats = [
    { title: "Tổng số xã", value: "150", change: "+5 so với kỳ trước", icon: "Users" },
    { title: "Xã đã tự đánh giá", value: "125", change: "83.3%", icon: "FileCheck2" },
    { title: "Hồ sơ chờ duyệt", value: "6", change: "+2 trong 24h", icon: "GanttChartSquare" },
    { title: "Tỷ lệ đạt chuẩn", value: "75.2%", change: "+3.2% so với kỳ trước", icon: "TrendingUp" },
];

export const recentAssessments = [
    { id: 'XA001', communeName: "Phường Bách Khoa", districtName: "Hai Bà Trưng", provinceName: "Hà Nội", submissionDate: "20/07/2024", status: "Chờ duyệt" },
    { id: 'XA002', communeName: "Xã Tân Triều", districtName: "Thanh Trì", provinceName: "Hà Nội", submissionDate: "19/07/2024", status: "Đã duyệt" },
    { id: 'XA003', communeName: "Phường Dịch Vọng Hậu", districtName: "Cầu Giấy", provinceName: "Hà Nội", submissionDate: "19/07/2024", status: "Bị từ chối" },
    { id: 'XA004', communeName: "Xã An Khánh", districtName: "Hoài Đức", provinceName: "Hà Nội", submissionDate: "18/07/2024", status: "Chờ duyệt" },
    { id: 'XA005', communeName: "Phường Quang Trung", districtName: "Hà Đông", provinceName: "Hà Nội", submissionDate: "17/07/2024", status: "Đã duyệt" },
];

export const assessmentStatusChartData = [
  { name: 'Chưa đánh giá', value: 25, fill: 'hsl(var(--muted-foreground))' },
  { name: 'Đang soạn thảo', value: 15, fill: 'hsl(var(--chart-4))' },
  { name: 'Chờ duyệt', value: 6, fill: 'hsl(var(--accent))' },
  { name: 'Đã duyệt', value: 94, fill: 'hsl(var(--primary))' },
  { name: 'Bị từ chối', value: 10, fill: 'hsl(var(--destructive))' },
];

export const units = [
    { id: 'DVI001', name: 'Sở Tư pháp Tỉnh X' },
    { id: 'DVI002', name: 'UBND Xã Y, Huyện Z' },
    { id: 'DVI003', name: 'UBND Xã A, Huyện B' },
    { id: 'DVI004', name: 'UBND Xã C, Huyện D' },
];

export const users = [
    { id: "USR001", name: "Nguyễn Văn A", email: "admin@example.com", unitId: "DVI001", role: "Cán bộ Tỉnh" },
    { id: "USR002", name: "Trần Thị B", email: "thib@commune.gov.vn", unitId: "DVI002", role: "Cán bộ Xã" },
    { id: "USR003", name: "Lê Văn C", email: "vanc@commune.gov.vn", unitId: "DVI003", role: "Cán bộ Xã" },
    { id: "USR004", name: "Phạm Thị D", email: "thid@commune.gov.vn", unitId: "DVI004", role: "Cán bộ Xã" },
    { id: "USR005", name: "Hoàng Văn E", email: "admin2@example.com", unitId: "DVI001", role: "Cán bộ Tỉnh" },
];

export const criteria = [
  {
    id: 'TC01',
    name: 'Tiêu chí 1: Công khai, minh bạch, dễ tiếp cận thông tin',
    indicators: [
      { id: 'CT1.1', name: 'Chỉ tiêu 1: Công khai thông tin theo quy định của Luật Tiếp cận thông tin', type: 'Boolean' },
      { id: 'CT1.2', name: 'Chỉ tiêu 2: Cung cấp thông tin theo yêu cầu', type: 'Percentage' },
    ]
  },
  {
    id: 'TC02',
    name: 'Tiêu chí 2: Hạ tầng, thiết bị và ứng dụng công nghệ thông tin',
    indicators: [
      { id: 'CT2.1', name: 'Chỉ tiêu 1: Trang thông tin điện tử của xã', type: 'Checklist' },
      { id: 'CT2.2', name: 'Chỉ tiêu 2: Hệ thống loa truyền thanh', type: 'Boolean' },
      { id: 'CT2.3', name: 'Chỉ tiêu 3: Nhà văn hóa, điểm sinh hoạt cộng đồng', type: 'Numeric' },
    ]
  },
   {
    id: 'TC03',
    name: 'Tiêu chí 3: Dân chủ ở cơ sở và hòa giải ở cơ sở',
    indicators: [
      { id: 'CT3.1', name: 'Chỉ tiêu 1: Thực hiện dân chủ ở cơ sở', type: 'Boolean' },
      { id: 'CT3.2', name: 'Chỉ tiêu 2: Hoạt động hòa giải ở cơ sở', type: 'Percentage' },
    ]
  },
];

export const guidanceDocuments = [
  { id: 'VB001', name: 'Nghị định số 59/2012/NĐ-CP về theo dõi tình hình thi hành pháp luật', number: '59/2012/NĐ-CP', issueDate: '09/07/2012' },
  { id: 'VB002', name: 'Thông tư số 14/2014/TT-BTP quy định chi tiết thi hành Nghị định số 59/2012/NĐ-CP', number: '14/2014/TT-BTP', issueDate: '29/08/2014' },
  { id: 'VB003', name: 'Quyết định số 25/2021/QĐ-TTg về xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật', number: '25/2021/QĐ-TTg', issueDate: '22/07/2021' },
  { id: 'VB004', name: 'Thông tư số 09/2021/TT-BTP hướng dẫn thi hành Quyết định số 25/2021/QĐ-TTg', number: '09/2021/TT-BTP', issueDate: '15/11/2021' },
];

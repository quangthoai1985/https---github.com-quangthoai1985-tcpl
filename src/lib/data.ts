
export const dashboardStats = [
    { title: "Tổng số xã", value: "150", change: "+5 so với kỳ trước", icon: "Users" },
    { title: "Xã đã tự đánh giá", value: "125", change: "83.3%", icon: "FileCheck2" },
    { title: "Hồ sơ chờ duyệt", value: "6", change: "+2 trong 24h", icon: "GanttChartSquare" },
    { title: "Tỷ lệ đạt chuẩn", value: "75.2%", change: "+3.2% so với kỳ trước", icon: "TrendingUp" },
];

export type Assessment = {
  id: string;
  communeName: string;
  districtName: string;
  provinceName: string;
  submissionDate: string;
  status: 'Chờ duyệt' | 'Đã duyệt' | 'Bị từ chối';
  rejectionReason?: string;
  communeExplanation?: string;
};


export const recentAssessments: Assessment[] = [
    { id: 'XA001', communeName: "Phường Bách Khoa", districtName: "Hai Bà Trưng", provinceName: "Hà Nội", submissionDate: "20/07/2024", status: "Chờ duyệt" },
    { id: 'XA002', communeName: "Xã Tân Triều", districtName: "Thanh Trì", provinceName: "Hà Nội", submissionDate: "19/07/2024", status: "Đã duyệt" },
    { id: 'XA003', communeName: "Phường Dịch Vọng Hậu", districtName: "Cầu Giấy", provinceName: "Hà Nội", submissionDate: "19/07/2024", status: "Bị từ chối", rejectionReason: "Minh chứng cho Chỉ tiêu 2.2 (Hệ thống loa truyền thanh) không hợp lệ. Yêu cầu cung cấp biên bản kiểm tra tình trạng kỹ thuật mới nhất và hình ảnh thực tế." },
    { id: 'XA004', communeName: "Xã An Khánh", districtName: "Hoài Đức", provinceName: "Hà Nội", submissionDate: "18/07/2024", status: "Chờ duyệt", communeExplanation: "Chúng tôi đã bổ sung biên bản kiểm tra tình trạng kỹ thuật hệ thống loa truyền thanh ngày 15/07/2024 và hình ảnh thực tế của hệ thống. Kính đề nghị quý sở xem xét lại." },
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
      {
        id: 'CT1.1',
        name: 'Chỉ tiêu 1: Công khai thông tin theo quy định của Luật Tiếp cận thông tin',
        description: 'Đánh giá việc công khai các thông tin mà cơ quan nhà nước có trách nhiệm công khai theo quy định pháp luật.',
        standardLevel: 'Đạt',
        inputType: 'boolean',
        calculationFormula: null,
        evidenceRequirement: 'Danh mục các thông tin đã được công khai, hình ảnh chụp màn hình trang thông tin điện tử, hoặc các văn bản công khai khác.'
      },
      {
        id: 'CT1.2',
        name: 'Chỉ tiêu 2: Cung cấp thông tin theo yêu cầu',
        description: 'Đánh giá tỷ lệ yêu cầu cung cấp thông tin của công dân, tổ chức được giải quyết đúng hạn.',
        standardLevel: '>= 90%',
        inputType: 'number',
        calculationFormula: '(Số yêu cầu được giải quyết đúng hạn / Tổng số yêu cầu đã nhận) * 100',
        evidenceRequirement: 'Sổ theo dõi hoặc báo cáo tổng hợp về việc tiếp nhận và giải quyết yêu cầu cung cấp thông tin.'
      },
    ]
  },
  {
    id: 'TC02',
    name: 'Tiêu chí 2: Hạ tầng, thiết bị và ứng dụng công nghệ thông tin',
    indicators: [
      {
        id: 'CT2.1',
        name: 'Chỉ tiêu 1: Trang thông tin điện tử của xã',
        description: 'Đảm bảo trang thông tin điện tử của xã có đầy đủ các chuyên mục, chức năng theo quy định và hoạt động ổn định.',
        standardLevel: 'Đạt',
        inputType: 'select',
        calculationFormula: null,
        evidenceRequirement: 'Địa chỉ URL của trang thông tin điện tử. Báo cáo tự đánh giá về các chuyên mục và chức năng.'
      },
      {
        id: 'CT2.2',
        name: 'Chỉ tiêu 2: Hệ thống loa truyền thanh',
        description: 'Kiểm tra tình trạng hoạt động và phạm vi phủ sóng của hệ thống loa truyền thanh cơ sở.',
        standardLevel: 'Hoạt động tốt',
        inputType: 'boolean',
        calculationFormula: null,
        evidenceRequirement: 'Biên bản kiểm tra tình trạng kỹ thuật, hình ảnh hệ thống loa.'
      },
      {
        id: 'CT2.3',
        name: 'Chỉ tiêu 3: Nhà văn hóa, điểm sinh hoạt cộng đồng',
        description: 'Thống kê số lượng nhà văn hóa, điểm sinh hoạt cộng đồng có trang thiết bị phục vụ việc tiếp cận thông tin, pháp luật.',
        standardLevel: '>= 1',
        inputType: 'number',
        calculationFormula: null,
        evidenceRequirement: 'Danh sách các nhà văn hóa, điểm sinh hoạt và trang thiết bị đi kèm.'
      },
    ]
  },
   {
    id: 'TC03',
    name: 'Tiêu chí 3: Dân chủ ở cơ sở và hòa giải ở cơ sở',
    indicators: [
      {
        id: 'CT3.1',
        name: 'Chỉ tiêu 1: Thực hiện dân chủ ở cơ sở',
        description: 'Đánh giá việc tổ chức các cuộc họp, đối thoại định kỳ với nhân dân và công khai các nội dung theo quy chế dân chủ ở cơ sở.',
        standardLevel: 'Đạt',
        inputType: 'boolean',
        calculationFormula: null,
        evidenceRequirement: 'Biên bản các cuộc họp, hình ảnh, báo cáo thực hiện quy chế dân chủ.'
      },
      {
        id: 'CT3.2',
        name: 'Chỉ tiêu 2: Hoạt động hòa giải ở cơ sở',
        description: 'Tỷ lệ vụ việc hòa giải thành công trên tổng số vụ việc được đưa ra hòa giải tại cơ sở.',
        standardLevel: '>= 80%',
        inputType: 'number',
        calculationFormula: '(Số vụ hòa giải thành / Tổng số vụ hòa giải) * 100',
        evidenceRequirement: 'Sổ theo dõi, báo cáo thống kê của các tổ hòa giải.'
      },
    ]
  },
];

export const guidanceDocuments = [
  { id: 'VB001', name: 'Quyết định số 25/2021/QĐ-TTg về xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật', number: '25/2021/QĐ-TTg', issueDate: '22/07/2021', excerpt: 'Quy định về tiêu chí xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật và việc đánh giá, công nhận xã, phường, thị trấn đạt chuẩn tiếp cận pháp luật.' },
  { id: 'VB002', name: 'Thông tư số 09/2021/TT-BTP hướng dẫn thi hành Quyết định số 25/2021/QĐ-TTg', number: '09/2021/TT-BTP', issueDate: '15/11/2021', excerpt: 'Hướng dẫn chi tiết về nội dung các tiêu chí tiếp cận pháp luật, quy trình đánh giá, và biểu mẫu sử dụng.' },
  { id: 'VB003', name: 'Luật Tiếp cận thông tin năm 2016', number: '104/2016/QH13', issueDate: '06/04/2016', excerpt: 'Quy định về việc thực hiện quyền tiếp cận thông tin của công dân, nguyên tắc, trình tự, thủ tục thực hiện quyền tiếp cận thông tin.'},
  { id: 'VB004', name: 'Luật Hòa giải ở cơ sở năm 2013', number: '59/2013/QH13', issueDate: '20/06/2013', excerpt: 'Quy định về nguyên tắc, chính sách của Nhà nước về hòa giải ở cơ sở; hòa giải viên; tổ chức và hoạt động hòa giải ở cơ sở.' },
];


export const assessmentPeriods = [
    { id: 'DOT001', name: 'Đợt đánh giá 6 tháng đầu năm 2024', startDate: '01/01/2024', endDate: '30/07/2024', status: 'Active' },
    { id: 'DOT002', name: 'Đợt đánh giá 6 tháng cuối năm 2023', startDate: '01/07/2023', endDate: '31/12/2023', status: 'Inactive' },
];

export const communeNotifications = [
    { id: 'N001', title: 'Hồ sơ của bạn đã được duyệt', time: '5 phút trước', read: false },
    { id: 'N002', title: 'Hồ sơ của bạn đã bị từ chối, vui lòng kiểm tra và gửi lại.', time: '1 giờ trước', read: false },
    { id: 'N003', title: 'Nhắc nhở: Sắp đến hạn nộp hồ sơ đánh giá.', time: 'Hôm qua', read: true },
];

export const adminNotifications = [
    { id: 'N001', title: 'Xã An Khánh vừa gửi hồ sơ đánh giá.', time: '15 phút trước', read: false },
    { id: 'N002', title: 'Xã Tân Triều vừa cập nhật hồ sơ bị từ chối.', time: '2 giờ trước', read: false },
    { id: 'N003', title: 'Phường Bách Khoa vừa gửi hồ sơ đánh giá.', time: 'Hôm qua', read: true },
];

    

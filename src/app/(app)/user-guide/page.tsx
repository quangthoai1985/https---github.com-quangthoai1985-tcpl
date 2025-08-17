
'use client';

import PageHeader from "@/components/layout/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/context/DataContext";
import { Users, FileCheck2, GanttChartSquare, FileText, Book, User, Settings, Loader2 } from "lucide-react";

export default function UserGuidePage() {
    const { role } = useData();

    if (!role) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <>
            <PageHeader 
                title="Hướng dẫn sử dụng" 
                description="Tài liệu hướng dẫn chi tiết các chức năng của hệ thống."
            />
            <div className="grid gap-6">
                {role === 'admin' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Dành cho Quản trị viên (Admin)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']}>
                                <AccordionItem value="item-1">
                                    <AccordionTrigger className="text-base font-semibold">
                                        <Users className="mr-2 h-5 w-5 text-primary"/> Quản lý Người dùng & Đơn vị
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Trang "Quản lý Người dùng" và "Quản lý Đơn vị" là nơi bạn thực hiện các thao tác quản trị tài khoản và các đơn vị cấp xã.</p>
                                        <ul>
                                            <li><strong>Thêm mới:</strong> Nhấn nút "Thêm" để tạo một đơn vị hoặc người dùng mới. Điền đầy đủ thông tin vào biểu mẫu. Mật khẩu được cấp cho người dùng mới cần được gửi riêng cho họ.</li>
                                            <li><strong>Sửa:</strong> Nhấn vào menu "..." ở cuối mỗi hàng và chọn "Sửa" để cập nhật thông tin. Bạn không thể sửa tên đăng nhập (email) của người dùng.</li>
                                            <li><strong>Xóa:</strong> Chọn "Xóa" từ menu. Hành động này sẽ xóa cả tài khoản đăng nhập khỏi hệ thống và không thể hoàn tác.</li>
                                            <li><strong>Đặt lại mật khẩu:</strong> Cung cấp một mật khẩu mới cho người dùng nếu họ quên mật khẩu.</li>
                                            <li><strong>Import từ Excel:</strong> Chức năng cho phép bạn thêm hàng loạt đơn vị và tài khoản người dùng tương ứng từ một file Excel duy nhất. Hãy tải file mẫu để xem đúng định dạng cột.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger className="text-base font-semibold">
                                        <FileCheck2 className="mr-2 h-5 w-5 text-primary"/> Quản lý Bộ tiêu chí & Đợt đánh giá
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Đây là các chức năng cốt lõi để thiết lập khung đánh giá cho toàn hệ thống.</p>
                                        <ul>
                                            <li><strong>Quản lý Tiêu chí:</strong> Cho phép bạn tạo, sửa, xóa các Tiêu chí lớn và các Chỉ tiêu con bên trong. Các chỉ tiêu này sẽ là cơ sở để các xã tự chấm điểm.</li>
                                            <li><strong>Quản lý Đợt đánh giá:</strong> Cho phép bạn tạo ra các kỳ đánh giá theo từng khoảng thời gian (ví dụ: 6 tháng đầu năm). Bạn có thể kích hoạt hoặc vô hiệu hóa một đợt đánh giá. <strong>Lưu ý:</strong> Tại một thời điểm, chỉ có một đợt đánh giá duy nhất được "kích hoạt". Các xã chỉ có thể nộp hồ sơ cho đợt đang hoạt động.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger className="text-base font-semibold">
                                         <GanttChartSquare className="mr-2 h-5 w-5 text-primary"/> Duyệt hồ sơ đánh giá
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Đây là nơi bạn xem xét các hồ sơ tự đánh giá do các xã gửi lên.</p>
                                        <ul>
                                            <li>Bạn có thể lọc hồ sơ theo từng đợt đánh giá.</li>
                                            <li>Các hồ sơ được phân loại theo các tab: "Chờ duyệt", "Đã duyệt", "Bị từ chối", "Chưa gửi".</li>
                                            <li>Nhấn "Xem chi tiết" để vào xem nội dung tự chấm điểm và các hồ sơ minh chứng mà xã đã cung cấp.</li>
                                            <li>Sau khi xem xét, bạn có thể ra quyết định "Phê duyệt" hoặc "Từ chối". Nếu từ chối, bạn cần ghi rõ lý do để xã có thể khắc phục và nộp lại.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="item-4">
                                    <AccordionTrigger className="text-base font-semibold">
                                         <FileText className="mr-2 h-5 w-5 text-primary"/> Báo cáo & Thống kê
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Trang này cung cấp cái nhìn tổng quan về tình hình đánh giá thông qua các biểu đồ trực quan, giúp bạn nhanh chóng nắm bắt được tiến độ và kết quả của từng đợt.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                )}

                {role === 'commune_staff' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Dành cho Cán bộ cấp Xã</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full" defaultValue={['item-c1', 'item-c2', 'item-c3', 'item-c4']}>
                                <AccordionItem value="item-c1">
                                    <AccordionTrigger className="text-base font-semibold">
                                        <FileCheck2 className="mr-2 h-5 w-5 text-primary"/> Tự chấm điểm
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Đây là chức năng chính của bạn. Bạn sẽ thực hiện việc tự đánh giá mức độ đạt chuẩn tiếp cận pháp luật của đơn vị mình dựa trên bộ tiêu chí do Admin ban hành.</p>
                                        <ul>
                                            <li>Truy cập trang "Tự chấm điểm" từ thanh điều hướng.</li>
                                            <li>Hệ thống sẽ hiển thị các tiêu chí và chỉ tiêu của đợt đánh giá đang hoạt động.</li>
                                            <li>Đối với mỗi chỉ tiêu, bạn cần điền kết quả tự đánh giá và tải lên các tệp hồ sơ minh chứng tương ứng (ví dụ: văn bản, hình ảnh...).</li>
                                            <li>Bạn có thể "Lưu nháp" để lưu lại tiến độ và quay lại làm tiếp sau.</li>
                                            <li>Khi đã hoàn thành tất cả các nội dung, nhấn "Gửi đánh giá" để nộp hồ sơ lên cho cấp trên xem xét.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="item-c2">
                                    <AccordionTrigger className="text-base font-semibold">
                                        <User className="mr-2 h-5 w-5 text-primary"/> Theo dõi hồ sơ & Giải trình
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Sau khi nộp, bạn có thể theo dõi trạng thái hồ sơ của mình tại trang "Tổng quan".</p>
                                        <ul>
                                            <li><strong>Nếu hồ sơ bị từ chối:</strong> Bạn sẽ nhận được thông báo. Hãy vào xem chi tiết hồ sơ để đọc lý do từ chối.</li>
                                            <li>Sau đó, bạn có thể thực hiện giải trình, bổ sung hồ sơ minh chứng và gửi lại để được xem xét lại.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-c3">
                                    <AccordionTrigger className="text-base font-semibold">
                                        <Book className="mr-2 h-5 w-5 text-primary"/> Văn bản hướng dẫn
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Đây là thư viện chứa các văn bản pháp luật, quyết định, thông tư... liên quan đến công tác đánh giá, giúp bạn tra cứu khi cần thiết.</p>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="item-c4">
                                    <AccordionTrigger className="text-base font-semibold">
                                        <Settings className="mr-2 h-5 w-5 text-primary"/> Hồ sơ cá nhân
                                    </AccordionTrigger>
                                    <AccordionContent className="prose prose-sm max-w-none pl-8 text-muted-foreground">
                                        <p>Bạn có thể thay đổi thông tin cá nhân như Họ tên và cập nhật mật khẩu tài khoản của mình tại đây để đảm bảo an toàn.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

    
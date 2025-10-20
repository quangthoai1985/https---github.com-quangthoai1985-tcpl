
'use client';

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssessmentStatus } from './types';

const StatusBadge = ({ status, isCriterion = false }: { status: AssessmentStatus, isCriterion?: boolean }) => {
    const badgeClasses = "text-sm px-3 py-1";
    let text = "";
    let style = "";

    switch (status) {
        case 'achieved':
            text = isCriterion ? 'Tiêu chí Đạt' : 'Đạt';
            style = "bg-green-600 hover:bg-green-700 text-white";
            break;
        case 'not-achieved':
            text = isCriterion ? 'Tiêu chí Không Đạt' : 'Không đạt';
            style = "bg-red-500 text-white border-red-600";
            break;
        case 'pending':
        default:
            text = isCriterion ? 'Chưa hoàn thành' : 'Chưa chấm';
            style = "border-amber-500 bg-amber-50 text-amber-800";
            break;
    }

    return isCriterion ? (
        <Badge variant={status === 'not-achieved' ? 'destructive' : 'default'} className={cn(badgeClasses, style)}>{text}</Badge>
    ) : (
        <Badge variant={status === 'not-achieved' ? 'destructive' : 'default'} className={cn(badgeClasses, style)}>{text}</Badge>
    );
};

export default StatusBadge;

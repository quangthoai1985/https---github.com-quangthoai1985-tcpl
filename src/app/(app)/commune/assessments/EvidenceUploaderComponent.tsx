'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, LinkIcon, File as FileIcon, X, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileWithStatus } from './types';

const EvidenceUploaderComponent = ({ indicatorId, parentIndicatorId, evidence, onEvidenceChange, isRequired, onPreview, docIndex, accept, contentId }: {
    indicatorId: string;
    parentIndicatorId?: string;
    evidence: FileWithStatus[];
    onEvidenceChange: (id: string, files: FileWithStatus[], docIndex?: number, fileToRemove?: FileWithStatus, contentId?: string) => void;
    isRequired: boolean;
    onPreview: (file: { name: string, url: string }) => void;
    docIndex?: number;
    accept?: string;
    contentId?: string;
}) => {
    const [linkInput, setLinkInput] = useState('');
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        onEvidenceChange(parentIndicatorId || indicatorId, [...evidence, ...newFiles], docIndex, undefined, contentId);
    };

    const handleEvidenceRemove = (itemToRemove: FileWithStatus) => {
        onEvidenceChange(parentIndicatorId || indicatorId, [], docIndex, itemToRemove, contentId);
    };

    const handleAddLink = () => {
        if (!linkInput.trim() || !linkInput.startsWith('http')) {
            toast({ variant: 'destructive', title: 'Lỗi', description: 'Vui lòng nhập một đường dẫn hợp lệ (bắt đầu bằng http hoặc https).' });
            return;
        }
        const newLink = { name: linkInput.trim(), url: linkInput.trim() };
        onEvidenceChange(parentIndicatorId || indicatorId, [...evidence, newLink], docIndex, undefined, contentId);
        setLinkInput('');
    };

    const isLink = (item: any): item is { name: string, url: string } => {
        return typeof item.url === 'string' && (item.url.startsWith('http://') || item.url.startsWith('https://'));
    }

    const acceptedFileText = accept === '.pdf'
        ? "Chỉ chấp nhận tệp PDF."
        : "Các tệp được chấp nhận: Ảnh, Video, Word, Excel, PDF.";

    return (
        <div className="grid gap-4">

            <div className={cn("w-full relative border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors", isRequired && "border-destructive")}>
                <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                    Kéo thả hoặc <span className="font-semibold text-primary">nhấn để chọn tệp</span>
                </p>
                <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple onChange={handleFileSelect} accept={accept} />
            </div>
             <p className="text-xs text-muted-foreground mt-1">{acceptedFileText} Dung lượng tối đa: 5MB.</p>

            <div className="grid gap-1">
                 <Label htmlFor={`link-${indicatorId}-${docIndex}-${contentId}`} className="text-xs">Hoặc thêm liên kết</Label>
                 <div className="flex gap-2">
                    <Input
                        id={`link-${indicatorId}-${docIndex}-${contentId}`}
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="Dán đường dẫn vào đây"
                        className="h-9 text-xs"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddLink}>Thêm</Button>
                 </div>
            </div>

             {isRequired && (
                <p className="text-sm font-medium text-destructive">
                    Yêu cầu ít nhất một minh chứng.
                </p>
            )}

            {evidence.length > 0 && (
                 <div className="space-y-2 mt-2">
                    {evidence.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-1.5 pl-2 bg-muted rounded-md text-sm">
                            <div className="flex items-center gap-2 w-0 flex-1 min-w-0">
                                {isLink(item) ? <LinkIcon className="h-4 w-4 flex-shrink-0 text-blue-500" /> : <FileIcon className="h-4 w-4 flex-shrink-0" />}
                                <span className="truncate text-xs flex-1">{item.name}</span>
                            </div>
                             <div className="flex items-center gap-1 flex-shrink-0">
                                { 'url' in item && item.url && (
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(item as { name: string, url: string })}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEvidenceRemove(item)}>
                                    <X className="h-4 w-4" />
                                </Button>
                             </div>
                        </div>
                    ))}
                 </div>
            )}
        </div>
    );
}

export default EvidenceUploaderComponent;

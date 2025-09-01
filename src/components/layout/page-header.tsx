
'use client';

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between space-y-2">
            <div>
                <h1 className="font-headline text-3xl font-normal tracking-tight">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex items-center space-x-2">{children}</div>}
        </div>
    );
}

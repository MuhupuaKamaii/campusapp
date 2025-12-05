import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import IndoorMapViewer from '@/components/IndoorMapViewer';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

export default function IndoorMapViewerPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Indoor Map" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4">
                    <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 003 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6.553 3.276A1 1 0 0021 20.382V9.618a1 1 0 00-1.447-.894L15 11m0 13V11m0 0L9 7" />
                            </svg>
                            <h3 className="font-semibold">Indoor Navigation Map</h3>
                        </div>
                        <p className="mb-6 text-sm text-gray-600">Navigate through building floors with interactive map</p>
                        
                        {/* Map Component */}
                        <div className="rounded-lg overflow-hidden border border-gray-200">
                            <IndoorMapViewer 
                                mapImageUrl="/data/nust-buildings.geojson" 
                                floorId={1}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

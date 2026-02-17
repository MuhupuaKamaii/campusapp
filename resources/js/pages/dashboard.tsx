import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import MapComponent, { type MapComponentRef } from '@/components/MapComponent';
import { useRef } from 'react';


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard() {
    const mapRef = useRef<MapComponentRef>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">

                    {/* Campus Overview Card */}
                    <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <h3 className="font-semibold text-gray-600">Campus Overview</h3>
                        </div>
                        <p className="mb-4 text-sm text-gray-600">NUST Campus Information</p>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Campuses</span>
                                <span className="text-lg font-semibold">2</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Buildings</span>
                                <span className="text-lg font-semibold">15+</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Active Users</span>
                                <span className="text-lg font-semibold">1,234</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tips Card */}
                    <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-white p-6 dark:border-sidebar-border">
                        <div className="mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="font-semibold text-gray-600">Navigation Tips</h3>
                        </div>
                        <p className="mb-4 text-sm text-gray-600">Get the most out of the map</p>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li className="flex gap-2">
                                <span>•</span>
                                <span>Drag to pan, scroll to zoom in/out</span>
                            </li>
                            <li className="flex gap-2">
                                <span>•</span>
                                <span>Use Shift + arrow keys for 3D rotation</span>
                            </li>
                            <li className="flex gap-2">
                                <span>•</span>
                                <span>Right-click to reset to NUST campus view</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Map Container */}
                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border text-gray-600">
                    <MapComponent ref={mapRef} />
                </div>
            </div>
        </AppLayout>
    );
}
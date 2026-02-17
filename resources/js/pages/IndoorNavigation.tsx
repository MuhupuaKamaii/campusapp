import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import IndoorMapViewer from '@/components/IndoorMapViewer';
import { useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Indoor Map',
        href: '/indoor-map',
    },
];

interface FloorPlan {
    filename: string;
    name: string;
}

export default function IndoorMapViewerPage() {
    const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
    const [selectedFloorPlan, setSelectedFloorPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch floor plans from the Floor Plans folder on mount
    useEffect(() => {
        setLoading(true);
        fetch('/api/floor-plans')
            .then(res => res.json())
            .then(data => {
                console.log('Floor plans fetched:', data);
                setFloorPlans(data);
                if (data.length > 0) {
                    setSelectedFloorPlan(data[0].filename);
                }
            })
            .catch(err => {
                console.error('Failed to fetch floor plans:', err);
                setFloorPlans([]);
            })
            .finally(() => setLoading(false));
    }, []);

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
                        <p className="mb-6 text-sm text-gray-600">Navigate through library floors</p>

                        {/* Building and Floor Selection */}
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-2">
                                    Building
                                </label>
                                <input
                                    type="text"
                                    value="Library Offices"
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600"
                                />
                            </div>

                            <div>
                                <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Floor
                                </label>
                                <select
                                    id="floor"
                                    value={selectedFloorPlan || ''}
                                    onChange={(e) => setSelectedFloorPlan(e.target.value)}
                                    disabled={loading || floorPlans.length === 0}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">Choose a floor...</option>
                                    {floorPlans.map(plan => (
                                        <option key={plan.filename} value={plan.filename}>
                                            {plan.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* Floor Plan PDF Display */}
                        {selectedFloorPlan && (
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                                <IndoorMapViewer 
                                    floorPlanFilename={selectedFloorPlan}
                                />
                            </div>
                        )}

                        {!selectedFloorPlan && (
                            <div className="rounded-lg border border-gray-200 p-8 text-center bg-gray-50">
                                <p className="text-gray-500">Select a floor to view the floor plan</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

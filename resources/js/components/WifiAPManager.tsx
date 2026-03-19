/*
 * WiFi Access Point Manager Component
 * Provides CRUD (Create, Read, Update, Delete) functionality for managing
 * WiFi access point locations and characteristics on a specific floor.
 * Features:
 * - Add new access points
 * - Edit existing access points
 * - Delete access points
 * - View all configured access points
 */

import { useState } from 'react';
import WifiScanner from './WifiScanner';

/**
 * Interface for WiFi access point data
 */
interface WifiAccessPoint {
    id: number;
    floor_id: number;
    ssid: string;                  // Network name
    bssid: string;                 // MAC address (unique identifier)
    x_coordinate: number;          // X position on floor plan
    y_coordinate: number;          // Y position on floor plan
    tx_power: number;              // Transmission power in dBm at 1 meter
    notes?: string;                // Optional notes
}
const scanNetworks = async () => {
  const { networks } = await WifiScanner.startScan();
  console.log(networks); // [{ssid, bssid, rssi, frequency}, ...]
};
/**
 * Props for WifiAPManager component
 */
interface Props {
    floorId: number | null;                                        // Currently selected floor
    accessPoints: WifiAccessPoint[];                               // List of access points on floor
    onAccessPointsChange: (aps: WifiAccessPoint[]) => void;        // Callback when data changes
}

export default function WifiAPManager({ floorId, accessPoints, onAccessPointsChange }: Props) {
    // UI state
    const [isAdding, setIsAdding] = useState(false);               // Show add form
    const [editingId, setEditingId] = useState<number | null>(null); // ID of AP being edited
    const [loading, setLoading] = useState(false);                 // Loading state for API calls

    // Form state for creating/editing access points
    const [formData, setFormData] = useState<Partial<WifiAccessPoint>>({
        ssid: '',
        bssid: '',
        x_coordinate: 0,
        y_coordinate: 0,
        tx_power: +20,              // Typical WiFi router power
        notes: '',
    });

    /**
     * Show the add access point form
     */
    const handleAddClick = () => {
        setIsAdding(true);
        setFormData({
            ssid: '',
            bssid: '',
            x_coordinate: 0,
            y_coordinate: 0,
            tx_power: +20,
            notes: '',
        });
    };

    /**
     * Show the edit form for an existing access point
     */
    const handleEditClick = (ap: WifiAccessPoint) => {
        setEditingId(ap.id);
        setFormData(ap);
    };

    /**
     * Save access point (create new or update existing)
     */
    const handleSave = async () => {
        // Validate floor is selected
        if (!floorId) {
            alert('Please select a floor first');
            return;
        }

        // Validate required fields
        if (!formData.ssid || !formData.bssid) {
            alert('SSID and BSSID are required');
            return;
        }

        setLoading(true);
        try {
            // Determine if we're creating or updating
            const endpoint = editingId ? `/api/wifi-ap/${editingId}` : '/api/wifi-ap';
            const method = editingId ? 'PUT' : 'POST';

            // Send request to API
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    // CSRF token from HTML meta tag
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    ...formData, bssid: formData.bssid?.toLowerCase(),
                    floor_id: floorId,
                }),
            });

            // Handle API errors
            if (!response.ok) {
                throw new Error('Failed to save access point');
            }

            // Refresh the access points list from server
            const listResponse = await fetch(`/api/floor/${floorId}/wifi-access-points`);
            const updatedAPs = await listResponse.json();
            onAccessPointsChange(updatedAPs);

            // Close form and reset state
            setIsAdding(false);
            setEditingId(null);
            console.log('✅ Access point saved');
        } catch (error) {
            console.error('Error saving access point:', error);
            alert('Failed to save access point');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Delete an access point
     */
    const handleDelete = async (id: number) => {
        // Confirm deletion
        if (!window.confirm('Delete this access point?')) return;

        setLoading(true);
        try {
            // Send delete request
            const response = await fetch(`/api/wifi-ap/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            // Handle errors
            if (!response.ok) {
                throw new Error('Failed to delete access point');
            }

            // Refresh list
            if (floorId) {
                const listResponse = await fetch(`/api/floor/${floorId}/wifi-access-points`);
                const updatedAPs = await listResponse.json();
                onAccessPointsChange(updatedAPs);
            }

            console.log('✅ Access point deleted');
        } catch (error) {
            console.error('Error deleting access point:', error);
            alert('Failed to delete access point');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold mb-4">
                        {editingId ? '✏️ Edit Access Point' : '➕ Add New Access Point'}
                    </h4>

                    {/* Form Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* SSID Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SSID (Network Name)
                            </label>
                            <input
                                type="text"
                                value={formData.ssid || ''}
                                onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="WiFi Network Name"
                            />
                        </div>

                        {/* BSSID Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                BSSID (MAC Address)
                            </label>
                            <input
                                type="text"
                                value={formData.bssid || ''}
                                onChange={(e) => setFormData({ ...formData, bssid: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="AA:BB:CC:DD:EE:FF"
                            />
                        </div>

                        {/* X Coordinate */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                X Position (pixels)
                            </label>
                            <input
                                type="number"
                                value={formData.x_coordinate || 0}
                                onChange={(e) => setFormData({ ...formData, x_coordinate: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Y Coordinate */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Y Position (pixels)
                            </label>
                            <input
                                type="number"
                                value={formData.y_coordinate || 0}
                                onChange={(e) => setFormData({ ...formData, y_coordinate: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* TX Power */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                TX Power (dBm at 1m)
                            </label>
                            <input
                                type="number"
                                value={formData.tx_power || +20}
                                onChange={(e) => setFormData({ ...formData, tx_power: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Typical: +20 to +30 dBm</p>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Location, ceiling height, etc."
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 font-medium text-sm transition"
                        >
                            💾 Save
                        </button>
                        <button
                            onClick={() => {
                                setIsAdding(false);
                                setEditingId(null);
                            }}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm transition"
                        >
                             Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Add New Button (shown when not adding/editing) */}
            {!isAdding && !editingId && (
                <div className="mb-6">
                    <button
                        onClick={handleAddClick}
                        disabled={!floorId}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 font-medium transition"
                    >
                        ➕ Add Access Point
                    </button>
                </div>
            )}

            {/* Access Points List */}
            {accessPoints.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500">
                    <p>📡 No access points configured for this floor</p>
                    <p className="text-sm mt-1">Click "Add Access Point" to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {accessPoints.map(ap => (
                        <div
                            key={ap.id}
                            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* AP Name */}
                                    <h4 className="font-semibold text-gray-900">
                                        📡 {ap.ssid}
                                    </h4>

                                    {/* BSSID (MAC Address) */}
                                    <p className="text-xs text-gray-500 font-mono mt-1">
                                        MAC: {ap.bssid}
                                    </p>

                                    {/* Position and Power */}
                                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">Location:</span>
                                            <p className="font-mono">(X: {ap.x_coordinate}, Y: {ap.y_coordinate})</p>
                                        </div>
                                        <div>
                                            <span className="font-medium">TX Power:</span>
                                            <p className="font-mono">{ap.tx_power} dBm</p>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {ap.notes && (
                                        <p className="text-sm text-gray-600 mt-2">
                                            💬 <span className="italic">{ap.notes}</span>
                                        </p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="ml-4 flex gap-2">
                                    {/* Edit Button */}
                                    <button
                                        onClick={() => handleEditClick(ap)}
                                        disabled={loading}
                                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition"
                                        title="Edit this access point"
                                    >
                                        ✏️
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(ap.id)}
                                        disabled={loading}
                                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 transition"
                                        title="Delete this access point"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// src/plugins/WifiScanner.ts
import { registerPlugin } from '@capacitor/core';

export interface WifiScannerPlugin {
  startScan(): Promise<{ networks: WifiNetwork[] }>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;      // MAC address — key for fingerprinting
  rssi: number;       // Signal strength — key for positioning
  frequency: number;
}

const WifiScanner = registerPlugin<WifiScannerPlugin>('WifiPlugin', {
  web: async () => { 
    return {
      startScan: async () => ({
        networks: [
          {
            ssid: 'Mock Wi-Fi Network',
            bssid: '00:11:22:33:44:55',
            rssi: -50,
            frequency: 2437
          }
        ]
      }),
      checkPermissions: async () => ({location: 'granted'}),
      requestPermissions: async () => ({location: 'granted'})
      }
    }
});
export default WifiScanner;
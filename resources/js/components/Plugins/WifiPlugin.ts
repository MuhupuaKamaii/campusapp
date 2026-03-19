import { registerPlugin } from '@capacitor/core';

export interface WifiNetwork {
  ssid: string;
  bssid: string;       // MAC address — key for fingerprinting
  rssi: number;        // Signal strength in dBm
  frequency: number;
}

export interface WifiPluginInterface {
  startScan(): Promise<{ networks: WifiNetwork[] }>;
}

const WifiPlugin = registerPlugin<WifiPluginInterface>('WifiPlugin', {
  // Web fallback for browser testing
  web: () => ({
    startScan: async () => ({
      networks: [
        { ssid: 'TestNetwork', bssid: '00:11:22:33:44:55', rssi: -65, frequency: 2437 }
      ]
    })
  })
});

export default WifiPlugin;
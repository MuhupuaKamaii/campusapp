import type { CapacitorConfig } from '@capacitor/cli';


const config: CapacitorConfig = {
  appId: 'com.example.indoornav',
  appName: 'indoor-nav-mobile',
  webDir: 'build',
  server: {
    url: 'http://192.168.1.94:8000',
    cleartext: true
  }
};

export default config;

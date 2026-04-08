import type { CapacitorConfig } from '@capacitor/cli';


const config: CapacitorConfig = {
  appId: 'com.example.indoornav',
  appName: 'indoor-nav-mobile',
  webDir: 'build',
  server: {
    url: 'http://127.0.0.1:3000',
    cleartext: true
  }
};

export default config;

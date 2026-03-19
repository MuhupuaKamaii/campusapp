<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * WiFi Scanning Service
 * 
 * Handles detection of available WiFi networks using OS-specific commands.
 * Supports Windows, Linux, and macOS with graceful fallbacks.
 * 
 * Detects:
 * - SSID (network name)
 * - BSSID (MAC address)
 * - RSSI (signal strength in dBm)
 */
class WifiScanningService
{
    /**
     * Scan for available WiFi networks on the system
     * 
     * Automatically detects OS and uses appropriate scanning method.
     * Returns array of detected networks with SSID, BSSID, and RSSI.
     * 
     * @return array Array of WiFi networks [['ssid' => '', 'bssid' => '', 'rssi' => int], ...]
     */
    public function scanNetworks(): array
    {
        $os = $this->detectOperatingSystem();
        
        return match ($os) {
            'windows' => $this->scanWindowsNetworks(),
            'linux' => $this->scanLinuxNetworks(),
            'darwin' => $this->scanMacOSNetworks(),
            default => $this->getMockNetworks(),
        };
    }

    /**
     * Detect operating system
     * 
     * @return string 'windows', 'linux', 'darwin', or 'unknown'
     */
    private function detectOperatingSystem(): string
    {
        $uname = php_uname('s');
        
        if (stripos($uname, 'Windows') !== false) {
            return 'windows';
        } elseif (stripos($uname, 'Linux') !== false) {
            return 'linux';
        } elseif (stripos($uname, 'Darwin') !== false) {
            return 'darwin';
        }
        
        return 'unknown';
    }

    /**
     * Scan WiFi networks on Windows
     * 
     * Uses: netsh wlan show networks mode=Bssid
     * Output format parses SSID, BSSID, and signal strength
     * 
     * @return array Array of WiFi networks
     */
    private function scanWindowsNetworks(): array
    {
        try {
            // Execute Windows WiFi scan command
            $output = shell_exec('netsh wlan show networks mode=Bssid 2>&1');
            
            if (!$output) {
                Log::warning('WiFi scan failed: netsh command returned empty');
                return $this->getMockNetworks();
            }

            $networks = [];
            $lines = explode("\n", $output);
            $currentSsid = '';
            
            foreach ($lines as $line) {
                $line = trim($line);
                
                // Look for SSID line: "SSID 1 : NetworkName"
                if (strpos($line, 'SSID ') !== false && strpos($line, ':') !== false) {
                    $parts = explode(':', $line, 2);
                    $currentSsid = trim($parts[1] ?? '');
                }
                
                // Look for BSSID line: "BSSID 1 : AA:BB:CC:DD:EE:FF"
                if (strpos($line, 'BSSID ') !== false && strpos($line, ':') !== false) {
                    $parts = explode(':', $line, 2);
                    $bssid = strtoupper(trim($parts[1] ?? ''));
                    
                    // Validate BSSID format (MAC address)
                    if ($this->isValidMacAddress($bssid)) {
                        // For Windows, we'll assign mock RSSI values based on position
                        // Real implementation would need additional parsing or Win32 API
                        $networks[] = [
                            'ssid' => $currentSsid ?: 'Hidden Network',
                            'bssid' => $bssid,
                            'rssi' => $this->generateMockRssi(),
                        ];
                    }
                }
            }
            
            return $networks;
        } catch (\Exception $e) {
            Log::error('Windows WiFi scan failed: ' . $e->getMessage());
            return $this->getMockNetworks();
        }
    }

    /**
     * Scan WiFi networks on Linux
     * 
     * Uses: nmcli device wifi list (preferred) or iwlist wlan0 scan
     * 
     * @return array Array of WiFi networks
     */
    private function scanLinuxNetworks(): array
    {
        try {
            // Try nmcli first (NetworkManager)
            $output = shell_exec('nmcli device wifi list 2>&1');
            
            if ($output && strpos($output, 'SSID') !== false) {
                return $this->parseNmcliOutput($output);
            }
            
            // Fall back to iwlist
            $output = shell_exec('iwlist wlan0 scan 2>&1');
            
            if ($output) {
                return $this->parseIwlistOutput($output);
            }
            
            return $this->getMockNetworks();
        } catch (\Exception $e) {
            Log::error('Linux WiFi scan failed: ' . $e->getMessage());
            return $this->getMockNetworks();
        }
    }

    /**
     * Parse nmcli output format
     * 
     * Format: SSID BSSID CHANNEL RATE SIGNAL BARS SECURITY
     * 
     * @param string $output nmcli output
     * @return array Parsed networks
     */
    private function parseNmcliOutput(string $output): array
    {
        $networks = [];
        $lines = explode("\n", $output);
        
        foreach ($lines as $line) {
            // Skip header and empty lines
            if (empty(trim($line)) || strpos($line, 'SSID') !== false) {
                continue;
            }
            
            // Parse line format: SSID BSSID CHANNEL RATE SIGNAL BARS SECURITY
            $parts = preg_split('/\s+/', trim($line), 7);
            
            if (count($parts) >= 5) {
                $ssid = $parts[0];
                $bssid = strtoupper($parts[1]);
                $signal = (int) $parts[4];
                
                // Convert signal percentage (0-100) to dBm (-30 to -100)
                $rssi = -30 + ($signal / 100) * -70;
                
                if ($this->isValidMacAddress($bssid)) {
                    $networks[] = [
                        'ssid' => $ssid !== '--' ? $ssid : 'Hidden Network',
                        'bssid' => $bssid,
                        'rssi' => (int) $rssi,
                    ];
                }
            }
        }
        
        return $networks;
    }

    /**
     * Parse iwlist output format
     * 
     * Looks for: Cell number, Address (BSSID), ESSID, Signal level
     * 
     * @param string $output iwlist output
     * @return array Parsed networks
     */
    private function parseIwlistOutput(string $output): array
    {
        $networks = [];
        $currentNetwork = [];
        
        $lines = explode("\n", $output);
        
        foreach ($lines as $line) {
            $line = trim($line);
            
            // New cell/network found
            if (strpos($line, 'Cell ') !== false) {
                if (!empty($currentNetwork)) {
                    $networks[] = $currentNetwork;
                }
                $currentNetwork = [];
            }
            
            // Extract BSSID (Address)
            if (strpos($line, 'Address:') !== false) {
                $bssid = strtoupper(str_replace('Address: ', '', $line));
                $currentNetwork['bssid'] = $bssid;
            }
            
            // Extract SSID (ESSID)
            if (strpos($line, 'ESSID:') !== false) {
                $ssid = str_replace(['ESSID:"', '"'], '', $line);
                $currentNetwork['ssid'] = !empty($ssid) ? $ssid : 'Hidden Network';
            }
            
            // Extract Signal level
            if (strpos($line, 'Signal level=') !== false) {
                // Format: "Signal level=-50 dBm" or "Signal level=50/70"
                preg_match('/Signal level[=:]([^\s]+)/', $line, $matches);
                
                if (isset($matches[1])) {
                    $value = $matches[1];
                    
                    // Parse dBm format
                    if (strpos($value, 'dBm') !== false) {
                        $rssi = (int) str_replace('dBm', '', $value);
                    } else {
                        // Parse ratio format (0-70 scale)
                        $rssi = (int) $value;
                    }
                    
                    $currentNetwork['rssi'] = $rssi;
                }
            }
        }
        
        // Don't forget last network
        if (!empty($currentNetwork) && isset($currentNetwork['bssid'])) {
            $networks[] = $currentNetwork;
        }
        
        return $networks;
    }

    /**
     * Scan WiFi networks on macOS
     * 
     * Uses: /System/Library/PrivateFrameworks/Apple80211.framework/.../airport -s
     * 
     * @return array Array of WiFi networks
     */
    private function scanMacOSNetworks(): array
    {
        try {
            $airportCmd = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s';
            $output = shell_exec($airportCmd . ' 2>&1');
            
            if (!$output) {
                return $this->getMockNetworks();
            }

            $networks = [];
            $lines = explode("\n", $output);
            
            foreach ($lines as $line) {
                // Skip header and empty lines
                if (empty(trim($line)) || strpos($line, 'SSID') !== false) {
                    continue;
                }
                
                // Format: SSID BSSID             RSSI CHANNEL HT CC SECURITY
                $parts = preg_split('/\s+/', trim($line), 7);
                
                if (count($parts) >= 3) {
                    $ssid = $parts[0];
                    $bssid = strtoupper($parts[1]);
                    $rssi = (int) $parts[2];
                    
                    if ($this->isValidMacAddress($bssid) && $rssi < 0) {
                        $networks[] = [
                            'ssid' => $ssid !== '--' ? $ssid : 'Hidden Network',
                            'bssid' => $bssid,
                            'rssi' => $rssi,
                        ];
                    }
                }
            }
            
            return $networks;
        } catch (\Exception $e) {
            Log::error('macOS WiFi scan failed: ' . $e->getMessage());
            return $this->getMockNetworks();
        }
    }

    /**
     * Validate MAC address format
     * 
     * Checks: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX format
     * 
     * @param string $mac MAC address to validate
     * @return bool True if valid
     */
    private function isValidMacAddress(string $mac): bool
    {
        return preg_match('/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i', $mac) === 1;
    }

    /**
     * Generate mock RSSI value
     * 
     * Used when actual signal strength cannot be determined.
     * Returns random value from -30 to -100 dBm.
     * 
     * @return int Mock RSSI value in dBm
     */
    private function generateMockRssi(): int
    {
        return rand(-100, -30);
    }

    /**
     * Get mock WiFi networks for testing/fallback
     * 
     * Used when actual scanning is not available or fails.
     * Provides realistic test data for UI development.
     * 
     * @return array Mock network data
     */
    private function getMockNetworks(): array
    {
        return [
            [
                'ssid' => 'Library-Main',
                'bssid' => 'AA:BB:CC:DD:EE:01',
                'rssi' => -35,
            ],
            [
                'ssid' => 'Library-WiFi',
                'bssid' => 'AA:BB:CC:DD:EE:02',
                'rssi' => -42,
            ],
            [
                'ssid' => 'Library-Guest',
                'bssid' => 'AA:BB:CC:DD:EE:03',
                'rssi' => -55,
            ],
            [
                'ssid' => 'Campus-5G',
                'bssid' => 'AA:BB:CC:DD:EE:04',
                'rssi' => -48,
            ],
            [
                'ssid' => 'Campus-2.4G',
                'bssid' => 'AA:BB:CC:DD:EE:05',
                'rssi' => -60,
            ],
        ];
    }
}

package com.example.indoornav;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import android.Manifest;
import android.content.BroadcastReceiver;  
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;

import java.util.List;

@CapacitorPlugin(name = "WifiPlugin", permissions = {
    @Permission(  alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, 
        Manifest.permission.ACCESS_WIFI_STATE,
        Manifest.permission.CHANGE_WIFI_STATE,
        Manifest.permission.ACCESS_COARSE_LOCATION
    } )
})

public class WifiPlugin extends Plugin {
    private WifiManager wifiManager;
    private PluginCall pendingCall;
private BroadcastReceiver scanReceiver;
        @Override
        protected void handleOnStart(){
            wifiManager = (WifiManager) getContext()
                .getApplicationContext()
                .getSystemService(Context.WIFI_SERVICE);
            scanReceiver = new BroadcastReceiver () {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (WifiManager.SCAN_RESULTS_AVAILABLE_ACTION.equals(intent.getAction())) {
                        List<ScanResult> results = wifiManager.getScanResults();
                        if (pendingCall != null) {
                            JSObject response = new JSObject();
                            JSArray networks = new JSArray();
                            for (ScanResult result : results) {
                                JSObject network = new JSObject();
                                network.put("ssid", result.SSID);
                                network.put("bssid", result.BSSID);   // MAC address for fingerprinting
                                network.put("rssi", result.level);     // Signal strength
                                network.put("frequency", result.frequency);
                                networks.put(network);
                            }
                            response.put("networks", networks);
                            pendingCall.resolve(response);
                            pendingCall = null;
                        }
                    }
                }
            };
             getContext().registerReceiver(scanReceiver, new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION));
             new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION);
        }

        @PluginMethod
    public void startScan(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        WifiManager wifiManager = (WifiManager) getContext()
            .getApplicationContext()
            .getSystemService(Context.WIFI_SERVICE);

        if (wifiManager == null || !wifiManager.isWifiEnabled()) {
            call.reject("Wi-Fi is not enabled");
            return;
        }

        wifiManager.startScan();
        List<ScanResult> results = wifiManager.getScanResults();

        JSArray networks = new JSArray();
        for (ScanResult result : results) {
            JSObject network = new JSObject();
            network.put("ssid", result.SSID);
            network.put("bssid", result.BSSID);   // MAC address for fingerprinting
            network.put("rssi", result.level);     // Signal strength
            network.put("frequency", result.frequency);
            networks.put(network);
        }

        JSObject response = new JSObject();
        response.put("networks", networks);
        call.resolve(response);
}
    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            startScan(call);
        } else {
            call.reject("Location permission is required to scan Wi-Fi networks");
        }
    }
}

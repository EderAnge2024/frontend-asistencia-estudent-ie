package com.sistema.asistenciasie;

import android.Manifest;
import android.content.Context;
import android.location.LocationManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "WifiPlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "camera",
            strings = {
                Manifest.permission.CAMERA
            }
        )
    }
)
public class WifiPlugin extends Plugin {

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermissionCallback");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("camera") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWifiInfo(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "wifiPermissionCallback");
            return;
        }
        readWifi(call);
    }

    @PermissionCallback
    private void wifiPermissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            readWifi(call);
        } else {
            call.reject("Se requiere permiso de ubicación en el celular para poder identificar la red Wi-Fi en Android.");
        }
    }

    private void readWifi(PluginCall call) {
        try {
            Context context = getContext();

            // Verificar si el GPS / Ubicación está activado en el teléfono (Requisito estricto de Android para acceder al SSID)
            LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            boolean isLocationEnabled = false;
            if (locationManager != null) {
                isLocationEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                                     locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            }

            WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifiManager == null) {
                call.reject("El dispositivo no cuenta con interfaz Wi-Fi disponible.");
                return;
            }

            WifiInfo info = wifiManager.getConnectionInfo();
            if (info == null) {
                call.reject("No hay conexión Wi-Fi activa.");
                return;
            }

            String ssid = info.getSSID();
            String bssid = info.getBSSID();

            // Android devuelve "<unknown ssid>" si el GPS/Ubicación está apagado
            if (ssid == null || ssid.equals("<unknown ssid>") || ssid.equals("\"<unknown ssid>\"") || !isLocationEnabled) {
                call.reject("Para detectar el nombre de la red Wi-Fi en Android, es obligatorio activar la 'Ubicación / GPS' de tu teléfono. Por favor, activa el GPS e inténtalo nuevamente.");
                return;
            }

            // Quitar comillas que Android suele agregar al SSID (ej: "MiRed" -> MiRed)
            if (ssid.startsWith("\"") && ssid.endsWith("\"") && ssid.length() >= 2) {
                ssid = ssid.substring(1, ssid.length() - 1);
            }

            // Filtrar BSSID genérico de privacidad "02:00:00:00:00:00"
            if (bssid != null && bssid.equalsIgnoreCase("02:00:00:00:00:00")) {
                bssid = "";
            }

            JSObject ret = new JSObject();
            ret.put("ssid", ssid != null ? ssid : "");
            ret.put("bssid", bssid != null ? bssid : "");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error al obtener la información de Wi-Fi: " + e.getMessage());
        }
    }
}

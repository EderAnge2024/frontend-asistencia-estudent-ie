package com.sistema.asistenciasie;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WifiPlugin.class);
        super.onCreate(savedInstanceState);

        solicitarPermisos();
    }

    private void solicitarPermisos() {
        String[] permisos = new String[]{
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };

        boolean necesitaPedir = false;
        for (String p : permisos) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                necesitaPedir = true;
                break;
            }
        }

        if (necesitaPedir) {
            ActivityCompat.requestPermissions(this, permisos, PERMISSION_REQ_CODE);
        }
    }
}


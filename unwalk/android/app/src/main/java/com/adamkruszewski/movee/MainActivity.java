package com.adamkruszewski.movee;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register Capacitor plugin
        registerPlugin(BackgroundStepCheckPlugin.class);
        
        // Initialize notification channel
        NotificationHelper.INSTANCE.createNotificationChannel(this);
        
        // Schedule background work (default 15 minutes)
        BackgroundStepCheckWorker.Companion.scheduleWork(this, 15L);
    }
}

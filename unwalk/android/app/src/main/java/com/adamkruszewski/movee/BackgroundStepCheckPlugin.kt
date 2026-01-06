package com.adamkruszewski.movee

import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "BackgroundStepCheck")
class BackgroundStepCheckPlugin : Plugin() {

    @PluginMethod
    fun setCheckInterval(call: PluginCall) {
        val minutes = call.getInt("minutes")
        
        if (minutes == null || minutes !in listOf(5, 10, 15, 30, 60)) {
            call.reject("Interval must be 5, 10, 15, 30, or 60 minutes")
            return
        }
        
        // Save to SharedPreferences
        val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        prefs.edit().putInt("check_interval_minutes", minutes).apply()
        
        // Reschedule WorkManager with new interval
        BackgroundStepCheckWorker.scheduleWork(context, minutes.toLong())
        
        val result = JSObject()
        result.put("success", true)
        result.put("interval", minutes)
        call.resolve(result)
    }
    
    @PluginMethod
    fun getCheckInterval(call: PluginCall) {
        val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        val interval = prefs.getInt("check_interval_minutes", 15)
        
        val result = JSObject()
        result.put("interval", interval)
        call.resolve(result)
    }
    
    @PluginMethod
    fun setActiveChallengeData(call: PluginCall) {
        val goalSteps = call.getInt("goalSteps")
        val title = call.getString("title")
        
        if (goalSteps == null || title == null) {
            call.reject("Missing required parameters")
            return
        }
        
        val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putInt("active_challenge_goal_steps", goalSteps)
            putString("active_challenge_title", title)
            putLong("active_challenge_updated_at", System.currentTimeMillis())
            // Reset progress notifications for new challenge
            putInt("last_challenge_progress_notified", 0)
            apply()
        }
        
        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }
    
    @PluginMethod
    fun clearActiveChallengeData(call: PluginCall) {
        val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        prefs.edit().apply {
            remove("active_challenge_goal_steps")
            remove("active_challenge_title")
            remove("active_challenge_updated_at")
            remove("last_challenge_progress_notified")
            apply()
        }
        
        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }
    
    @PluginMethod
    fun getCachedSteps(call: PluginCall) {
        val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        val steps = prefs.getInt("cached_today_steps", 0)
        val timestamp = prefs.getLong("cached_steps_timestamp", 0)
        
        val result = JSObject()
        result.put("steps", steps)
        result.put("timestamp", timestamp / 1000) // Convert to seconds
        result.put("isCached", timestamp > 0)
        call.resolve(result)
    }
    
    @PluginMethod
    fun triggerManualCheck(call: PluginCall) {
        // Trigger immediate one-time work
        androidx.work.OneTimeWorkRequestBuilder<BackgroundStepCheckWorker>()
            .build()
            .let { androidx.work.WorkManager.getInstance(context).enqueue(it) }
        
        // Wait a bit and return cached steps
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
            val steps = prefs.getInt("cached_today_steps", 0)
            
            val result = JSObject()
            result.put("success", true)
            result.put("steps", steps)
            call.resolve(result)
        }, 2000)
    }
    
    @PluginMethod
    fun getBackgroundCheckStatus(call: PluginCall) {
        val prefs = context.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        val interval = prefs.getInt("check_interval_minutes", 15)
        val lastCheck = prefs.getLong("cached_steps_timestamp", 0)
        
        val result = JSObject()
        result.put("enabled", true)
        result.put("interval", interval)
        result.put("lastCheckTimestamp", lastCheck / 1000) // Convert to seconds
        if (lastCheck > 0) {
            result.put("lastCheckDate", java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
                .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
                .format(java.util.Date(lastCheck)))
        }
        call.resolve(result)
    }
}

package com.adamkruszewski.movee

import android.content.Context
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

class BackgroundStepCheckWorker(
    context: Context,
    params: WorkerParameters
) : Worker(context, params) {

    companion object {
        private const val TAG = "BackgroundStepCheck"
        const val WORK_NAME = "background_step_check"
        
        fun scheduleWork(context: Context, intervalMinutes: Long = 15) {
            val constraints = Constraints.Builder()
                .setRequiresBatteryNotLow(false)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<BackgroundStepCheckWorker>(
                intervalMinutes, TimeUnit.MINUTES,
                5, TimeUnit.MINUTES // Flex interval
            )
                .setConstraints(constraints)
                .addTag(WORK_NAME)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
            
            Log.d(TAG, "Scheduled background check every $intervalMinutes minutes")
        }
        
        fun cancelWork(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Cancelled background check")
        }
    }

    override fun doWork(): Result {
        Log.d(TAG, "Background step check started")
        
        return try {
            // Get today's steps from Health Connect
            val stepsCount = getStepsFromHealthConnect()
            
            // Save to SharedPreferences for JS access
            val prefs = applicationContext.getSharedPreferences("background_check", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putInt("cached_today_steps", stepsCount)
                putLong("cached_steps_timestamp", System.currentTimeMillis())
                apply()
            }
            
            Log.d(TAG, "Current steps: $stepsCount")
            
            // Check goals and send notifications
            checkGoalsAndNotify(stepsCount)
            
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check steps", e)
            Result.retry()
        }
    }
    
    private fun getStepsFromHealthConnect(): Int {
        // TODO: Integrate with Health Connect API
        // For now, return cached value or 0
        val prefs = applicationContext.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        return prefs.getInt("cached_today_steps", 0)
    }
    
    private fun checkGoalsAndNotify(currentSteps: Int) {
        val prefs = applicationContext.getSharedPreferences("background_check", Context.MODE_PRIVATE)
        val dailyGoal = 10000
        
        // Check daily goal
        if (currentSteps >= dailyGoal) {
            val lastGoalNotification = prefs.getLong("last_goal_notification_date", 0)
            val today = getTodayStartTimestamp()
            
            if (lastGoalNotification < today) {
                NotificationHelper.sendNotification(
                    applicationContext,
                    "🎉 Daily Goal Achieved!",
                    "You've reached $currentSteps steps today. Keep it up!",
                    "daily_goal_$today"
                )
                prefs.edit().putLong("last_goal_notification_date", System.currentTimeMillis()).apply()
            }
        }
        
        // Check milestones
        checkMilestones(currentSteps, prefs)
        
        // Check active challenge
        checkActiveChallenge(currentSteps, prefs)
    }
    
    private fun checkMilestones(currentSteps: Int, prefs: android.content.SharedPreferences) {
        val milestones = listOf(2500, 5000, 7500)
        val lastMilestone = prefs.getInt("last_milestone_notified", 0)
        
        for (milestone in milestones) {
            if (currentSteps >= milestone && lastMilestone < milestone) {
                NotificationHelper.sendNotification(
                    applicationContext,
                    "🚀 Milestone Reached!",
                    "You've walked $milestone steps today!",
                    "milestone_$milestone"
                )
                prefs.edit().putInt("last_milestone_notified", milestone).apply()
                break
            }
        }
    }
    
    private fun checkActiveChallenge(currentSteps: Int, prefs: android.content.SharedPreferences) {
        val goalSteps = prefs.getInt("active_challenge_goal_steps", 0)
        val challengeTitle = prefs.getString("active_challenge_title", null)
        
        if (goalSteps > 0 && challengeTitle != null) {
            val progress = (currentSteps.toDouble() / goalSteps.toDouble() * 100).toInt()
            val thresholds = listOf(50, 75, 90, 100)
            val lastNotified = prefs.getInt("last_challenge_progress_notified", 0)
            
            for (threshold in thresholds) {
                if (progress >= threshold && lastNotified < threshold) {
                    val emoji = if (threshold == 100) "🎉" else "💪"
                    NotificationHelper.sendNotification(
                        applicationContext,
                        "$emoji Challenge Progress",
                        "$threshold% complete on '$challengeTitle'! $currentSteps/$goalSteps steps",
                        "challenge_$threshold"
                    )
                    prefs.edit().putInt("last_challenge_progress_notified", threshold).apply()
                    break
                }
            }
        }
    }
    
    private fun getTodayStartTimestamp(): Long {
        val calendar = java.util.Calendar.getInstance()
        calendar.set(java.util.Calendar.HOUR_OF_DAY, 0)
        calendar.set(java.util.Calendar.MINUTE, 0)
        calendar.set(java.util.Calendar.SECOND, 0)
        calendar.set(java.util.Calendar.MILLISECOND, 0)
        return calendar.timeInMillis
    }
}

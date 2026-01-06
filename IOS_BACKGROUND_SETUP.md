# iOS Background Task Configuration

## Required Changes

### 1. Info.plist Configuration

Add the following to your `ios/App/App/Info.plist`:

```xml
<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>processing</string>
    <string>remote-notification</string>
</array>

<!-- Background Task Identifiers -->
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
    <string>com.unwalk.backgroundStepCheck</string>
</array>

<!-- Health Kit Usage Description -->
<key>NSHealthShareUsageDescription</key>
<string>We need access to your step data to track your progress and send timely notifications about your goals and challenges.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>We need access to update your health data.</string>
```

### 2. Xcode Project Settings

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select your app target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability" and add:
   - **Background Modes**
     - ✅ Background fetch
     - ✅ Background processing
     - ✅ Remote notifications
   - **HealthKit**
     - Enable HealthKit capability

### 3. Testing Background Tasks (Simulator/Device)

To test background tasks in Xcode:

1. Build and run the app
2. Stop the app from Xcode (don't close it on device)
3. In Xcode, go to **Debug** → **Simulate Background Fetch**
4. Or use terminal command:
   ```bash
   xcrun simctl spawn booted notify_post com.unwalk.backgroundStepCheck
   ```

### 4. Testing on Real Device

Background tasks won't run frequently in debug mode. To properly test:

1. Build for Release mode
2. Install on device
3. Use the app normally
4. Wait 15-30 minutes with app in background
5. Check notifications

### 5. Debugging Background Tasks

Add this to test background tasks:
```bash
# Enable background task logging
e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.unwalk.backgroundStepCheck"]
```

## Important Notes

- iOS limits background task frequency (system decides when to run)
- Background tasks may not run if device is in Low Power Mode
- Tasks are more likely to run when device is charging
- System prioritizes apps that user actively uses
- First few background executions might be delayed (iOS learning pattern)

## Troubleshooting

If background tasks don't work:

1. Check Info.plist has correct identifiers
2. Verify Background Modes capability is enabled
3. Ensure HealthKit permissions are granted
4. Check device is not in Low Power Mode
5. Use app frequently to establish usage pattern
6. Check Xcode console for BGTaskScheduler logs

# CapacitorApnsToken

iOS-only Capacitor plugin that exposes the APNs device token stored by the host app.

## JS name

`ApnsToken`

## Methods

- `getToken(): Promise<{ token?: string }>`

The host app must store the token in `UserDefaults` under key `apns_device_token` (this repo's iOS AppDelegate does that).

# AtlasBasket Delivery Mobile App

This is a native React Native iOS/Android app for delivery partners. It recreates the delivery website's rider flows with native screens and uses the same delivery backend API. The website itself is not modified.

## Requirements

- Node.js and npm
- Expo SDK 58
- A deployed, publicly reachable delivery API and WebSocket endpoint

## Configure

Configure `.env` before running:

```env
EXPO_PUBLIC_API_URL=https://your-delivery-api.example.com
EXPO_PUBLIC_WS_URL=wss://your-delivery-api.example.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

The API and WebSocket origins must be reachable by the device. For local testing, use a LAN address reachable from the phone; `localhost` on a phone refers to the phone itself. Configure the Google web, iOS and Android OAuth client IDs for native Google sign-in. These `EXPO_PUBLIC_` values are bundled into the app and must never contain server secrets.

## Run

```sh
npm install
npx expo start
```

For a tunnel connection, run `npx expo start --tunnel` (the `--tunnel` option follows `start`). Then open the project in Expo Go, or run `npm run android` / `npm run ios` with the corresponding development environment.

## Notes

- The app uses native React Native screens and navigation; it does not display the website in a WebView.
- Admin-managed delivery branding, landing cards, service availability, vehicle options, and enabled districts come from the same public API as the website. Settings refresh on screen focus, when the app returns to foreground, and periodically while it is open.
- The Android system Back button navigates through the app's native screen stack.
- The app requests foreground location access for rider availability and dispatch updates.
- Google sign-in uses the delivery backend's native credential endpoint.

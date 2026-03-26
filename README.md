# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Security Before Production

Before deploying, review Supabase security settings:

- Verify whether **Anonymous Auth** should remain enabled. It is currently used for local testing.
- Confirm RLS policies for `user_kink_preferences` enforce the intended access model.
- Confirm foreign key relationships and delete behavior are still correct for `auth.users`, `kinks`, and `categories`.
- Remove or gate any dev-only test flows that could create unintended writes in production.

## Launch Checklist

- Verify all required environment variables are set for production.
- Confirm Supabase project URL and keys are pointing to the production project.
- Run lint and type checks (`npm run lint` and `npx tsc --noEmit`).
- Validate critical user flows on iOS and Android (onboarding, swiping, persistence, compatibility score).
- Confirm error logging/monitoring is enabled and visible before release.

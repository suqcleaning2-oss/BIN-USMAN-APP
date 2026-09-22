import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'binusman.application',
  appName: 'BIN USMAN APP',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        swiftToolsVersion: '6.1',
        packageOptions: {
          '@capacitor-firebase/authentication': {
            symlink: true,
          },
        },
        packageTraits: {
          '@capacitor-firebase/authentication': ['Google'],
        },
      },
    },
  },
};

export default config;

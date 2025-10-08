module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/features': './src/features',
            '@/shared': './src/shared',
            '@/navigation': './src/navigation',
            '@/store': './src/store',
            '@/config': './src/config',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};

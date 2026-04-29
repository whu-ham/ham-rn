const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const path = require('path');
const config = {
  resolver: {
    extraNodeModules: {
      '@': path.resolve(__dirname, 'src'),
    },
    blockList: [
      /scripts\/.*/,
      /src\/business\/education\/scorecalc\/embed\/(?!generated\/).*/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

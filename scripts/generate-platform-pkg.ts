import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = 'build';
const MODULES_DIR = 'src/modules';
const CODEGEN_BASE = {
  name: 'RNNativeModuleSpec',
  type: 'modules',
  jsSrcsDir: 'modules',
};

const KEEP_DEV_DEPS = ['hot-updater', '@react-native-community/cli', 'husky'];
const PLATFORM_CLI_DEPS = {
  ios: '@react-native-community/cli-platform-ios',
  android: '@react-native-community/cli-platform-android',
} as const;

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

function readBasePkg(): PackageJson {
  const pkg = JSON.parse(
    fs.readFileSync('package.json', 'utf8'),
  ) as PackageJson;

  // Only keep specified devDependencies
  const originalDevDeps = pkg.devDependencies ?? {};
  pkg.devDependencies = Object.fromEntries(
    KEEP_DEV_DEPS.filter(dep => dep in originalDevDeps).map(dep => [
      dep,
      originalDevDeps[dep],
    ]),
  );

  delete pkg.scripts;
  delete pkg['lint-staged'];
  // pnpm.patchedDependencies points at patches/ relative to this repo's root.
  // The generated package.json is written to build/{ios,android} and installed
  // from there, where patches/ does not exist, so pnpm aborts with
  //   ENOENT: no such file or directory, open '.../build/ios/patches/...'
  // The patches only rewrite Android Gradle buildscript blocks, which matter
  // for this repo's android/ app build, not for the downstream repos that
  // consume this package.json.
  delete pkg.pnpm;

  return pkg;
}

function getModulesProvider(): Record<string, string> {
  return fs
    .readdirSync(MODULES_DIR)
    .filter(f => f.endsWith('.ts'))
    .reduce(
      (acc, file) => {
        const name = path.basename(file, '.ts');
        acc[name] = 'RN' + name;
        return acc;
      },
      {} as Record<string, string>,
    );
}

function getPlatformPackage(
  pkg: PackageJson,
  platform: keyof typeof PLATFORM_CLI_DEPS,
): PackageJson {
  const platformCli = PLATFORM_CLI_DEPS[platform];
  const dependencies = pkg.dependencies ?? {};
  const cliVersion =
    dependencies[platformCli] ??
    pkg.devDependencies?.['@react-native-community/cli'];

  if (!cliVersion) {
    throw new Error(`Missing ${platformCli} version in package metadata`);
  }

  return {
    ...pkg,
    dependencies: {
      ...dependencies,
      [platformCli]: cliVersion,
    },
  };
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function generate() {
  const pkg = readBasePkg();
  const modulesProvider = getModulesProvider();

  writeJson(`${OUTPUT_DIR}/package.ios.json`, {
    ...getPlatformPackage(pkg, 'ios'),
    codegenConfig: {...CODEGEN_BASE, ios: {modulesProvider}},
  });

  writeJson(`${OUTPUT_DIR}/package.android.json`, {
    ...getPlatformPackage(pkg, 'android'),
    codegenConfig: {
      ...CODEGEN_BASE,
      android: {javaPackageName: 'com.nowcent.ham.rn.nativemodule'},
    },
  });
}

generate();

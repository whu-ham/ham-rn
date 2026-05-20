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

function readBasePkg() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

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

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function generate() {
  const pkg = readBasePkg();
  const modulesProvider = getModulesProvider();

  writeJson(`${OUTPUT_DIR}/package.ios.json`, {
    ...pkg,
    codegenConfig: {...CODEGEN_BASE, ios: {modulesProvider}},
  });

  writeJson(`${OUTPUT_DIR}/package.android.json`, {
    ...pkg,
    codegenConfig: {
      ...CODEGEN_BASE,
      android: {javaPackageName: 'com.nowcent.ham.rn.nativemodule'},
    },
  });
}

generate();

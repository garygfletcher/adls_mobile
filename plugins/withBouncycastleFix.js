const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER_START = '// ADLS_BOUNCYCASTLE_FIX_START';
const MARKER_END = '// ADLS_BOUNCYCASTLE_FIX_END';

const GRADLE_SNIPPET = `
${MARKER_START}
allprojects {
  configurations.all {
    resolutionStrategy {
      force 'org.bouncycastle:bcprov-jdk15to18:1.81'
      force 'org.bouncycastle:bcutil-jdk15to18:1.81'
    }
  }
}
${MARKER_END}
`;

function withBouncycastleFix(config) {
  return withProjectBuildGradle(config, (configResult) => {
    if (configResult.modResults.language !== 'groovy') {
      return configResult;
    }

    const contents = configResult.modResults.contents;
    if (!contents.includes(MARKER_START)) {
      configResult.modResults.contents = `${contents}\n${GRADLE_SNIPPET}\n`;
    }

    return configResult;
  });
}

module.exports = withBouncycastleFix;

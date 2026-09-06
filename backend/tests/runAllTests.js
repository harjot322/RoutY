const { runEtaTests } = require('./etaEngine.test');
const { runApiTests } = require('./api.test');

async function main() {
  console.log('====================================================');
  console.log('  RoutY Complete Automated Verification Suite');
  console.log('====================================================');

  try {
    runEtaTests();
    await runApiTests();
    console.log('\n✅ ALL 12 BACKEND & API TESTS PASSED SUCCESSFULLY! 🎉\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  }
}

main();

import {
  loadMinerData,
  analyzeMinerDistribution,
  displayMinerAnalysis,
  saveAnalysisToJSON,
  saveAnalysisToCSV,
} from './miner-analyzer';

const main = () => {
  console.log('Loading miner data...\n');

  // Load the data
  const minerData = loadMinerData('miner-data.json');

  // Analyze distribution
  const analysis = analyzeMinerDistribution(minerData);

  // Display results
  displayMinerAnalysis(analysis);

  // Save to files
  saveAnalysisToJSON(analysis, 'miner-analysis.json');
  saveAnalysisToCSV(analysis, 'miner-analysis.csv');

  console.log('\nAnalysis complete!');
};

main();

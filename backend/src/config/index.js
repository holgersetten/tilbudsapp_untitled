const path = require('path');

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiRateLimit: process.env.API_RATE_LIMIT || 100,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Paths
  backendDir: path.resolve(__dirname, '../..'),
  offersDir: path.resolve(__dirname, '../../offers'),
  mealsFile: path.resolve(__dirname, '../../meals.json'),
  categoriesFile: path.resolve(__dirname, '../../categories.json'),
  tagsFile: path.resolve(__dirname, '../../tags.json'),
  synonymsFile: path.resolve(__dirname, '../../synonyms.json'),
  
  // External APIs
  tjekApiBaseUrl: process.env.TJEK_API_BASE_URL || 'https://squid-api.tjek.com/v2',
  
  // NLP
  nlpEnabled: process.env.NLP_ENABLED === 'true',
  pythonNlpPort: process.env.PYTHON_NLP_PORT || 5001,
};

module.exports = config;

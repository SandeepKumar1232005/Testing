require('dotenv').config({ path: '../.env' });

module.exports = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  dbString: process.env.DB_CONNECTION_STRING || '',
};

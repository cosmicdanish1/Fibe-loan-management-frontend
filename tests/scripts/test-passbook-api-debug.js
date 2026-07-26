/**
 * PassBook API Debug Script
 * Tests the actual API response and identifies issues
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function debugPassBookAPI() {
  try {
    console.log('=== PASSBOOK API DEBUG TEST ===');
    console.log('Testing PassBook API with member 610015819...');
    
    const response = await axios.get(`${API_BASE_URL}/report/passbook-printing`, {
      params: {
        memberNo: '610015819',
        includeZeroBalance: true
      },
      timeout: 15000
    });
    
    console.log('\n--- API RESPONSE STATUS ---');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    console.log('\n--- API RESPONSE HEADERS ---');
    console.log('Content-Type:', response.headers['content-type']);
    
    console.log('\n--- API RESPONSE DATA STRUCTURE ---');
    console.log('Response keys:', Object.keys(response.data));
    
    if (response.data.data) {
      console.log('Response.data keys:', Object.keys(response.data.data));
      
      if (response.data.data.memberDetails) {
        console.log('\n--- MEMBER DETAILS ---');
        console.log(JSON.stringify(response.data.data.memberDetails, null, 2));
      }
      
      if (response.data.data.accounts) {
        console.log('\n--- ACCOUNTS DATA ---');
        console.log('Number of accounts:', response.data.data.accounts.length);
        if (response.data.data.accounts.length > 0) {
          console.log('First account structure:');
          console.log(JSON.stringify(response.data.data.accounts[0], null, 2));
        }
      }
      
      console.log('\n--- SUMMARY DATA ---');
      console.log('Total Accounts:', response.data.data.totalAccounts);
      console.log('Total Transactions:', response.data.data.totalTransactions);
      console.log('Generated At:', response.data.data.generatedAt);
    }
    
    console.log('\n--- FULL RESPONSE (First 1000 chars) ---');
    console.log(JSON.stringify(response.data, null, 2).substring(0, 1000) + '...');
    
  } catch (error) {
    console.error('\n❌ API ERROR:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Error Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error('Request setup error');
    }
  }
}

debugPassBookAPI();
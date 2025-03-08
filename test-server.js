const fetch = require('node-fetch');

async function testServer() {
  try {
    console.log('Testing server connection...');
    const response = await fetch('http://localhost:3000/api/test');
    const data = await response.json();
    console.log('Server response:', data);
    
    console.log('\nTesting chat API...');
    const chatResponse = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message',
        sectionContent: 'Test content',
        sectionName: 'Test section'
      })
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`Chat API error: ${chatResponse.status} ${chatResponse.statusText}\n${errorText}`);
    }
    
    const chatData = await chatResponse.json();
    console.log('Chat API response:', chatData);
    
    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testServer(); 
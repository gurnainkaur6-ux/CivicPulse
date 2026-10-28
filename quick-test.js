const { Client, Databases } = require('node-appwrite');
const fs = require('fs');

// Read fresh .env values
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=#]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const client = new Client()
  .setEndpoint(env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(env.APPWRITE_API_KEY);

const databases = new Databases(client);

console.log('🔍 Testing Appwrite Connection...\n');
console.log('Project:', env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
console.log('Database:', env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID);
console.log('API Key:', env.APPWRITE_API_KEY.substring(0, 20) + '...\n');

databases.listCollections(env.NEXT_PUBLIC_APPWRITE_DOCUMENTS_DB_ID)
  .then(result => {
    console.log('✅ SUCCESS! Connection working!\n');
    console.log(`Found ${result.collections.length} collection(s):\n`);
    
    if (result.collections.length > 0) {
      result.collections.forEach(col => {
        console.log(`📁 ${col.name}`);
        console.log(`   ID: ${col.$id}`);
        console.log(`   Documents: ${col.total}\n`);
      });
    } else {
      console.log('⚠️  No collections found yet.');
      console.log('   Next step: Create tables in Appwrite Console!\n');
    }
    
    console.log('🎉 Appwrite is ready to use!\n');
  })
  .catch(error => {
    console.log('❌ ERROR:', error.message, '\n');
  });

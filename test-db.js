const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://mern_user:zjYlild0KhMS2ZP0@lamargaritadb.5zsg8rb.mongodb.net/test';

async function testDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));

    // Check eventos collection
    const eventosCollection = mongoose.connection.db.collection('eventos');
    const eventCount = await eventosCollection.countDocuments();
    console.log(`📅 Events in 'eventos' collection: ${eventCount}`);

    if (eventCount > 0) {
      const sampleEvents = await eventosCollection.find().limit(3).toArray();
      console.log('📝 Sample events:', JSON.stringify(sampleEvents, null, 2));
    }

    // Check usuarios collection
    const usuariosCollection = mongoose.connection.db.collection('usuarios');
    const userCount = await usuariosCollection.countDocuments();
    console.log(`👥 Users in 'usuarios' collection: ${userCount}`);

    if (userCount > 0) {
      const sampleUsers = await usuariosCollection.find({}, { password: 0 }).limit(3).toArray();
      console.log('👤 Sample users:', JSON.stringify(sampleUsers, null, 2));
    }

  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testDatabase();

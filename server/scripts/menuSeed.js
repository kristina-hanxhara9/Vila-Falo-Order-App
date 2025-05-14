// server/scripts/menuSeed.js
require('dotenv').config();
const mongoose = require('mongoose');

// Direct MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI 
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected to:', MONGO_URI))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define MenuItem schema
const MenuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  albanianName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'drink', 'dessert']
  },
  price: {
    type: Number,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  albanianDescription: {
    type: String,
    trim: true
  }
});

// Create model with explicit collection name
const MenuItem = mongoose.model('MenuItem', MenuItemSchema, 'menuitems');

// Menu items from the Vila Falo menu
const menuItems = [
  // Main Courses (Pjate Kryesore)
  {
    name: 'Lamb in Oven',
    albanianName: 'Qingji i pjekur ne furre',
    category: 'food',
    price: 2800,
    description: 'Oven roasted lamb',
    albanianDescription: 'Qingji i pjekur ne furre'
  },
  {
    name: 'Lamb in Can',
    albanianName: 'Qingji i mbyllur ne bidon',
    category: 'food',
    price: 2800,
    description: 'Lamb cooked in traditional can',
    albanianDescription: 'Qingji i mbyllur ne bidon'
  },
  {
    name: 'Veal in Oven',
    albanianName: 'Paidhaqe qingji ne zgare',
    category: 'food',
    price: 2400,
    description: 'Veal ribs roasted in oven',
    albanianDescription: 'Paidhaqe qingji ne zgare'
  },
  {
    name: 'Goat in Oven',
    albanianName: 'Paidhaqe gici ne zgare',
    category: 'food',
    price: 1700,
    description: 'Goat meat roasted in oven',
    albanianDescription: 'Paidhaqe gici ne zgare'
  },
  {
    name: 'Pork Ribs Grilled',
    albanianName: 'Berxolle derri ne zgare',
    category: 'food',
    price: 900,
    description: 'Grilled pork ribs',
    albanianDescription: 'Berxolle derri ne zgare'
  },
  {
    name: 'Veal with Lemon Sauce',
    albanianName: 'Mish vici i mbyllur me salce limoni',
    category: 'food',
    price: 1200,
    description: 'Veal meat with lemon sauce',
    albanianDescription: 'Mish vici i mbyllur me salce limoni'
  },
  {
    name: 'Gjyveç (Traditional Dish)',
    albanianName: 'Tigania (mish derri i shuar me vere)',
    category: 'food',
    price: 800,
    description: 'Pork meat cooked with wine',
    albanianDescription: 'Mish derri i shuar me vere'
  },
  {
    name: 'Chicken Fillet Grilled',
    albanianName: 'Fileto pule ne zgare',
    category: 'food',
    price: 600,
    description: 'Grilled chicken fillet',
    albanianDescription: 'Fileto pule ne zgare'
  },
  {
    name: 'Lamb Thigh Roasted',
    albanianName: 'Koke qingji ne furre',
    category: 'food',
    price: 800,
    description: 'Roasted lamb thigh',
    albanianDescription: 'Koke qingji ne furre'
  },
  {
    name: 'Veal Steak with Mushrooms',
    albanianName: 'Biftek vici me hudhra dhe vere te bardhe',
    category: 'food',
    price: 1200,
    description: 'Veal steak with mushrooms and white wine',
    albanianDescription: 'Biftek vici me hudhra dhe vere te bardhe'
  },
  
  // Special Order Items (Specialitete me Porosi)
  {
    name: 'Lakror (Traditional Pie)',
    albanianName: 'Lakror ne sac (40 min)',
    category: 'food',
    price: 1500,
    description: 'Traditional pie with vegetables (40 min preparation)',
    albanianDescription: 'Qepe-domate, presh e gjize, hithri, spinaq, kos-veze'
  },
  {
    name: 'Fried Trout',
    albanianName: 'Petulla te fshira',
    category: 'food',
    price: 800,
    description: 'Fried trout with herbs',
    albanianDescription: 'Palacinka te renditura me hudhra, djathe dhe gjalpe'
  },
  {
    name: 'Grilled Corn with Honey',
    albanianName: 'Pispili me mjell misri (1 ore)',
    category: 'food',
    price: 1700,
    description: 'Grilled corn with honey (1 hour preparation)',
    albanianDescription: 'Hithri, presh-gjize'
  },
  {
    name: 'Baked Chicken',
    albanianName: 'Pule fshati (1 ore)',
    category: 'food',
    price: 3500,
    description: 'Country chicken, baked (1 hour preparation)',
    albanianDescription: 'Tave me jufka, petka, pilaf, qull'
  },
  {
    name: 'Corn Bread',
    albanianName: 'Kukurec',
    category: 'food',
    price: 800,
    description: 'Traditional corn bread',
    albanianDescription: 'Kukurec'
  },
  {
    name: 'Lamb Ribs',
    albanianName: 'Te brendshme qingji',
    category: 'food',
    price: 800,
    description: 'Lamb ribs, special preparation',
    albanianDescription: 'Te brendshme qingji'
  },
  
  // Coffee and Desserts (Kafe-Embelsira)
  {
    name: 'Turkish Coffee/Espresso',
    albanianName: 'Kafe turke/espresso',
    category: 'drink',
    price: 100,
    description: 'Turkish coffee or espresso',
    albanianDescription: 'Kafe turke/espresso'
  },
  {
    name: 'Black Tea',
    albanianName: 'Caj i ngrohte',
    category: 'drink',
    price: 100,
    description: 'Hot black tea',
    albanianDescription: 'Caj i ngrohte'
  },
  {
    name: 'Organic Mountain Tea',
    albanianName: 'Caj mali bio',
    category: 'drink',
    price: 150,
    description: 'Organic mountain tea',
    albanianDescription: 'Caj mali bio'
  },
  {
    name: 'Organic Mountain Tea with Honey',
    albanianName: 'Caj mali bio me mjalte',
    category: 'drink',
    price: 250,
    description: 'Organic mountain tea with honey',
    albanianDescription: 'Caj mali bio me mjalte'
  },
  {
    name: 'Hot Chocolate/Cocoa',
    albanianName: 'Cokollate/kakao',
    category: 'drink',
    price: 150,
    description: 'Hot chocolate or cocoa',
    albanianDescription: 'Cokollate/kakao'
  },
  {
    name: 'Cappuccino',
    albanianName: 'Salep/cappuccino',
    category: 'drink',
    price: 150,
    description: 'Cappuccino',
    albanianDescription: 'Salep/cappuccino'
  },
  {
    name: 'Yogurt with Honey and Nuts',
    albanianName: 'Kos me mjalte dhe arra',
    category: 'dessert',
    price: 300,
    description: 'Yogurt with honey and nuts',
    albanianDescription: 'Kos me mjalte dhe arra'
  },
  {
    name: 'Yogurt with Fruits and Honey',
    albanianName: 'Kos me fruta dhe mjalte',
    category: 'dessert',
    price: 300,
    description: 'Yogurt with fruits and honey',
    albanianDescription: 'Kos me fruta dhe mjalte'
  },
  {
    name: 'Traditional Sweets',
    albanianName: 'Shendetlie',
    category: 'dessert',
    price: 200,
    description: 'Traditional Albanian sweets',
    albanianDescription: 'Shendetlie'
  },
  
  // Salads and Appetizers 1 (Sallata-Antipasta)
  {
    name: 'Mixed Salad',
    albanianName: 'Djathe miks',
    category: 'food',
    price: 600,
    description: 'Mixed cheese plate',
    albanianDescription: 'Djathe miks'
  },
  {
    name: 'Oven Cheese',
    albanianName: 'Djathe ne furre',
    category: 'food',
    price: 450,
    description: 'Baked cheese',
    albanianDescription: 'Djathe ne furre'
  },
  {
    name: 'Roasted Pepper with Cheese',
    albanianName: 'Kackavalli pjekur',
    category: 'food',
    price: 400,
    description: 'Roasted yellow cheese',
    albanianDescription: 'Kackavalli pjekur (Saganaki)'
  },
  {
    name: 'Bean Stew',
    albanianName: 'Fasule pllaqi',
    category: 'food',
    price: 500,
    description: 'Traditional bean stew',
    albanianDescription: 'Fasule pllaqi'
  },
  {
    name: 'Roasted Vegetables with Spices',
    albanianName: 'Fergese me speca dhe gjize',
    category: 'food',
    price: 500,
    description: 'Roasted vegetables with cottage cheese and spices',
    albanianDescription: 'Fergese me speca dhe gjize'
  },
  {
    name: 'Yogurt with Cucumber',
    albanianName: 'Kos dele/lope',
    category: 'food',
    price: 250,
    description: 'Sheep/cow yogurt',
    albanianDescription: 'Kos dele/lope'
  },
  {
    name: 'Organic Sheep Milk',
    albanianName: 'Dhalle bio',
    category: 'drink',
    price: 300,
    description: 'Organic buttermilk',
    albanianDescription: 'Dhalle bio'
  },
  {
    name: 'Pasta with Cheese',
    albanianName: 'Makarona me gjalpe',
    category: 'food',
    price: 300,
    description: 'Pasta with butter and cheese',
    albanianDescription: 'Makarona me gjalpe'
  },
  {
    name: 'Pasta with Tomato Sauce',
    albanianName: 'Makarona me salce domate',
    category: 'food',
    price: 400,
    description: 'Pasta with tomato sauce',
    albanianDescription: 'Makarona me salce domate'
  },
  {
    name: 'Daily Soup',
    albanianName: 'Supe e dites',
    category: 'food',
    price: 350,
    description: 'Soup of the day',
    albanianDescription: 'Supe e dites'
  },
  {
    name: 'Roasted Peppers with Garlic Sauce',
    albanianName: 'Speca te pjekur me salce nardeni',
    category: 'food',
    price: 500,
    description: 'Roasted peppers with garlic sauce',
    albanianDescription: 'Speca te pjekur me salce nardeni'
  },
  
  // Salads and Appetizers 2
  {
    name: 'Vila Falo Special Salad',
    albanianName: 'Sallate "Falo"',
    category: 'food',
    price: 650,
    description: 'Special house salad with vegetables, chicken, and dressing',
    albanianDescription: 'Sallate jeshile, miser, fileto pule, buke e thekur, majoneze'
  },
  {
    name: 'Seafood Salad',
    albanianName: 'Sallate fshati',
    category: 'food',
    price: 450,
    description: 'Traditional country salad',
    albanianDescription: 'Sallate fshati'
  },
  {
    name: 'Green Salad',
    albanianName: 'Sallate jeshile',
    category: 'food',
    price: 350,
    description: 'Fresh green salad',
    albanianDescription: 'Sallate jeshile'
  },
  {
    name: 'Mixed Salad',
    albanianName: 'Sallate mikse',
    category: 'food',
    price: 650,
    description: 'Mixed vegetable salad',
    albanianDescription: 'Sallate fshati, laker e kuqe e bardhe'
  },
  {
    name: 'Cabbage Salad',
    albanianName: 'Sallate laker',
    category: 'food',
    price: 400,
    description: 'Fresh cabbage salad',
    albanianDescription: 'Sallate laker'
  },
  {
    name: 'Pickles',
    albanianName: 'Turshi te stines',
    category: 'food',
    price: 500,
    description: 'Seasonal pickled vegetables',
    albanianDescription: 'Turshi te stines'
  },
  {
    name: 'Grilled Vegetables',
    albanianName: 'Perime te pjekura',
    category: 'food',
    price: 500,
    description: 'Assorted grilled vegetables',
    albanianDescription: 'Perime te pjekura'
  },
  {
    name: 'Mixed Appetizers',
    albanianName: 'Miks salcash',
    category: 'food',
    price: 650,
    description: 'Assorted dips and appetizers',
    albanianDescription: 'Miks salcash'
  },
  {
    name: 'Fried Potatoes',
    albanianName: 'Patate te skuqura',
    category: 'food',
    price: 300,
    description: 'French fries',
    albanianDescription: 'Patate te skuqura'
  },
  {
    name: 'Assorted Sauces',
    albanianName: 'Salce kosi/xaxiki/kafteri',
    category: 'food',
    price: 350,
    description: 'Yogurt sauce, tzatziki, spicy sauce',
    albanianDescription: 'Salce kosi/xaxiki/kafteri'
  },
  {
    name: 'Sheep Cheese',
    albanianName: 'Djathe dele/lope/dhie/nape',
    category: 'food',
    price: 350,
    description: 'Assorted cheese (sheep, cow, goat)',
    albanianDescription: 'Djathe dele/lope/dhie/nape'
  },
  
  // Drinks (Pije)
  {
    name: 'Soft Drinks',
    albanianName: 'Pije freskuese',
    category: 'drink',
    price: 150,
    description: 'Soft drinks',
    albanianDescription: 'Pije freskuese'
  },
  {
    name: 'Red Bull',
    albanianName: 'Redbull',
    category: 'drink',
    price: 300,
    description: 'Red Bull energy drink',
    albanianDescription: 'Redbull'
  },
  {
    name: 'Tirana Beer',
    albanianName: 'Birre Tirana, Kuqalashe',
    category: 'drink',
    price: 150,
    description: 'Tirana beer, local brew',
    albanianDescription: 'Birre Tirana, Kuqalashe'
  },
  {
    name: 'Korça Beer',
    albanianName: 'Birre Korca',
    category: 'drink',
    price: 200,
    description: 'Korça beer, premium local brand',
    albanianDescription: 'Birre Korca'
  },
  {
    name: 'Amstel/Heineken',
    albanianName: 'Amstel/Heineken (0,33ml)',
    category: 'drink',
    price: 250,
    description: 'Amstel or Heineken beer (330ml)',
    albanianDescription: 'Amstel/Heineken (0,33ml)'
  },
  {
    name: 'Pils Beer (Greek)',
    albanianName: 'Pils (Greke)',
    category: 'drink',
    price: 200,
    description: 'Greek Pils beer',
    albanianDescription: 'Pils (Greke)'
  },
  {
    name: 'Non-alcoholic Beer',
    albanianName: 'Birre pa alkool',
    category: 'drink',
    price: 200,
    description: 'Non-alcoholic beer',
    albanianDescription: 'Birre pa alkool'
  },
  {
    name: 'Organic Juice',
    albanianName: 'Komposto bio',
    category: 'drink',
    price: 100,
    description: 'Organic fruit juice',
    albanianDescription: 'Komposto bio'
  },
  {
    name: 'Mineral Water',
    albanianName: 'Uje i vogel',
    category: 'drink',
    price: 200,
    description: 'Small mineral water bottle',
    albanianDescription: 'Uje i vogel'
  },
  {
    name: 'Large Water',
    albanianName: 'Uje i madh',
    category: 'drink',
    price: 900,
    description: 'Large water bottle (1L)',
    albanianDescription: 'Uje i madh'
  },
  {
    name: 'Open Wine',
    albanianName: 'Vere e hapur',
    category: 'drink',
    price: 250,
    description: 'House wine, served by glass',
    albanianDescription: 'Vere e hapur'
  },
  {
    name: 'Bottled Wine',
    albanianName: 'Vere gote',
    category: 'drink',
    price: 1500,
    description: 'Bottled wine, various options (1500-7000 LEK)',
    albanianDescription: 'Vere gote (1500-7000 LEK)'
  },
  {
    name: 'Raki Shishe',
    albanianName: 'Vere shishe',
    category: 'drink',
    price: 100,
    description: 'Traditional Albanian spirit',
    albanianDescription: 'Vere shishe'
  },
  {
    name: 'Raki Kumbulle/Rrushi',
    albanianName: 'Raki kumbulle/rrushi',
    category: 'drink',
    price: 200,
    description: 'Plum or grape raki',
    albanianDescription: 'Raki kumbulle/rrushi'
  },
  {
    name: 'Raki Muskat/Thane/Mani',
    albanianName: 'Raki muskat/thane/mani',
    category: 'drink',
    price: 200,
    description: 'Special flavored raki',
    albanianDescription: 'Raki muskat/thane/mani'
  },
  {
    name: 'Dellinje/Perla',
    albanianName: 'Dellinje/perla',
    category: 'drink',
    price: 350,
    description: 'Traditional Albanian spirits',
    albanianDescription: 'Dellinje/perla'
  },
  {
    name: 'Alcoholic Beverages',
    albanianName: 'Pije alkoolike',
    category: 'drink',
    price: 300,
    description: 'Assorted alcoholic beverages',
    albanianDescription: 'Pije alkoolike'
  },
  
  // Breakfast (Mengjesi)
  {
    name: 'Milk',
    albanianName: 'Qumesht lope',
    category: 'drink',
    price: 100,
    description: 'Fresh cow milk',
    albanianDescription: 'Qumesht lope'
  },
  {
    name: 'Mountain Tea',
    albanianName: 'Caj mali',
    category: 'drink',
    price: 350,
    description: 'Traditional mountain tea',
    albanianDescription: 'Caj mali'
  },
  {
    name: 'Village Omelette',
    albanianName: 'Petulla fshati',
    category: 'food',
    price: 150,
    description: 'Traditional village pancakes',
    albanianDescription: 'Petulla fshati'
  },
  {
    name: 'Butter/Jam/Honey',
    albanianName: 'Gjalpe/recel/mjalte',
    category: 'food',
    price: 350,
    description: 'Butter, jam, and honey',
    albanianDescription: 'Gjalpe/recel/mjalte'
  },
  {
    name: 'Cheese',
    albanianName: 'Djathe',
    category: 'food',
    price: 200,
    description: 'Assorted cheese',
    albanianDescription: 'Djathe'
  },
  {
    name: 'Boiled Eggs',
    albanianName: 'Veze sy',
    category: 'food',
    price: 200,
    description: 'Boiled eggs',
    albanianDescription: 'Veze sy'
  },
  {
    name: 'Simple Omelette',
    albanianName: 'Omelete e thjeshte',
    category: 'food',
    price: 300,
    description: 'Simple plain omelette',
    albanianDescription: 'Omelete e thjeshte'
  },
  {
    name: 'Cheese Omelette',
    albanianName: 'Omelete me djathe',
    category: 'food',
    price: 400,
    description: 'Omelette with cheese',
    albanianDescription: 'Omelete me djathe'
  },
  {
    name: 'Traditional Breakfast',
    albanianName: 'Trahana/petka',
    category: 'food',
    price: 350,
    description: 'Traditional Albanian breakfast',
    albanianDescription: 'Trahana/petka'
  }
];

// Seed database
async function seedMenuItems() {
  try {
    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items');
    
    // Insert new menu items
    const result = await MenuItem.insertMany(menuItems);
    console.log(`Successfully inserted ${result.length} menu items`);
    
    // Verify the items were inserted correctly
    const count = await MenuItem.countDocuments();
    console.log(`Total menu items in database: ${count}`);
    
    // Show collection name
    console.log('Collection being used:', MenuItem.collection.name);
    
    // Show some sample items
    const sampleItems = await MenuItem.find().limit(2);
    console.log('Sample items:', sampleItems);
    
    console.log('Menu seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding menu items:', error);
  } finally {
    // Close MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the seeding function
seedMenuItems();
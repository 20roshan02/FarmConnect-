require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../model/userSchema");
const Product = require("../model/productSchema");

const PRODUCT_TEMPLATES = [
  {
    title: "Tomato",
    category: "vegetables",
    price: 80,
    unit: "kg",
    stock: 100,
    description: "Fresh, naturally ripened tomatoes suitable for daily cooking and salads.",
    imageVariants: [
      "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1561136594-7f68413baa99?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    title: "Cauliflower",
    category: "vegetables",
    price: 110,
    unit: "kg",
    stock: 80,
    description: "Crisp cauliflower grown with careful farm practices and delivered fresh.",
    imageVariants: [
      "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    title: "Apple",
    category: "fruits",
    price: 250,
    unit: "kg",
    stock: 70,
    description: "Fresh, crisp apples sourced from Nepalese hill orchards.",
    imageVariants: [
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    title: "Potato",
    category: "vegetables",
    price: 75,
    unit: "kg",
    stock: 150,
    description: "Good-quality local potatoes, cleaned and ready for household cooking.",
    imageVariants: [
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80&sat=-15",
    ],
  },
  {
    title: "Rice",
    category: "grains",
    price: 120,
    unit: "kg",
    stock: 110,
    description: "Quality Nepali rice suitable for everyday family meals.",
    imageVariants: [
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=900&q=80",
    ],
  },
  {
    title: "Lentils",
    category: "grains",
    price: 180,
    unit: "kg",
    stock: 65,
    description: "Clean, nutritious lentils suitable for dal and traditional Nepali meals.",
    imageVariants: [
      "https://images.unsplash.com/photo-1585994293475-9f7e6d4b5c2f?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?auto=format&fit=crop&w=900&q=80",
    ],
  },
];

function farmerLocation(farmer) {
  const address = farmer.address || {};
  return address.district || address.city || address.street || "Nepal";
}

function imageForFarmer(template, farmerIndex) {
  return template.imageVariants[farmerIndex % template.imageVariants.length];
}

async function seedProducts() {
  let insertedTotal = 0;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const farmers = await User.find({ role: "farmer" }).select("_id name address").lean();

    if (farmers.length === 0) {
      console.log("No existing farmers found. No products inserted.");
      return;
    }

    for (const [farmerIndex, farmer] of farmers.entries()) {
      const existingProducts = await Product.find({ farmer: farmer._id })
        .select("title")
        .lean();
      const existingTitles = new Set(existingProducts.map((product) => product.title.trim().toLowerCase()));
      const productsToInsert = PRODUCT_TEMPLATES
        .filter((template) => !existingTitles.has(template.title.toLowerCase()))
        .map((template) => ({
          title: template.title,
          description: template.description,
          price: template.price,
          stock: template.stock,
          farmer: farmer._id,
          images: imageForFarmer(template, farmerIndex),
          category: template.category,
          unit: template.unit,
          location: farmerLocation(farmer),
          status: "approved",
        }));

      if (productsToInsert.length > 0) {
        await Product.insertMany(productsToInsert);
      }

      insertedTotal += productsToInsert.length;
      console.log(`Farmer: ${farmer.name || farmer._id}`);
      console.log(`Inserted: ${productsToInsert.length}`);
      console.log(`Skipped: ${PRODUCT_TEMPLATES.length - productsToInsert.length}`);
    }

    const totalSkipped = farmers.reduce((total, farmer) => total + PRODUCT_TEMPLATES.length, 0) - insertedTotal;
    console.log(`Total farmers processed: ${farmers.length}`);
    console.log(`Total products inserted: ${insertedTotal}`);
    console.log(`Total products skipped: ${totalSkipped}`);
  } catch (error) {
    console.error("Product seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seedProducts();

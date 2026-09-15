require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Product = require("../model/productSchema");

// These are the same product-specific image variants used by seedProducts.js.
const IMAGE_VARIANTS = {
  tomato: [
    "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1561136594-7f68413baa99?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=900&q=80",
  ],
  cauliflower: [
    "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1566842600175-97dca489844f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1598030343246-eec71cb442c8?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603048719539-9ecb4aa395e3?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?auto=format&fit=crop&w=900&q=80",
  ],
  apple: [
    "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1590393802688-ab3fd8e8e2b9?auto=format&fit=crop&w=900&q=80",
  ],
  potato: [
    "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1592997571654-4d45f671d182?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1508313880080-c4bef0730395?auto=format&fit=crop&w=900&q=80",
  ],
  rice: [
    "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=900&q=80",
  ],
  lentils: [
    "https://images.unsplash.com/photo-1585994293475-9f7e6d4b5c2f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=80",
  ],
};

function imageKey(product) {
  const title = product.title.trim().toLowerCase();
  const matchingTitle = Object.keys(IMAGE_VARIANTS).find((key) => title.includes(key));
  if (matchingTitle) return matchingTitle;
  if (product.category === "fruits") return "apple";
  if (product.category === "grains") return "rice";
  if (product.category === "vegetables") return "tomato";
  return null;
}

async function updateProductImages() {
  let changedCount = 0;
  let skippedCount = 0;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const products = await Product.find({}).select("_id title category images").lean();
    const groups = new Map();

    for (const product of products) {
      const titleKey = product.title.trim().toLowerCase();
      if (!groups.has(titleKey)) groups.set(titleKey, []);
      groups.get(titleKey).push(product);
    }

    const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
    const orderedGroups = duplicateGroups.sort((a, b) => a[0].title.localeCompare(b[0].title));

    console.log(`Total products checked: ${products.length}`);
    console.log(`Duplicate-title groups found: ${orderedGroups.length}`);

    for (const group of orderedGroups) {
      const key = imageKey(group[0]);
      const variants = key ? IMAGE_VARIANTS[key] : [];

      if (variants.length === 0) {
        skippedCount += group.length;
        console.log(`Skipped group "${group[0].title}": no suitable image variants.`);
        continue;
      }

      const orderedProducts = [...group].sort((a, b) => a._id.toString().localeCompare(b._id.toString()));

      for (const [index, product] of orderedProducts.entries()) {
        const newImage = variants[index];
        if (!newImage) {
          skippedCount += 1;
          continue;
        }
        if (product.images === newImage) {
          skippedCount += 1;
          continue;
        }

        await Product.updateOne(
          { _id: product._id },
          { $set: { images: newImage } },
        );
        changedCount += 1;
        console.log(`Changed ${product.title} (${product._id}): ${product.images || "<empty>"} -> ${newImage}`);
      }
    }

    skippedCount += products.length - orderedGroups.reduce((total, group) => total + group.length, 0);
    console.log(`Products whose images were changed: ${changedCount}`);
    console.log(`Products skipped: ${skippedCount}`);
  } catch (error) {
    console.error("Product image migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

updateProductImages();

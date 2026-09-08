const mongoose = require("mongoose");

async function connectDb(params) {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const orderCollection = mongoose.connection.collection("orders");
    const orderIndexes = await orderCollection.indexes();
    if (orderIndexes.some((index) => index.name === "transactionUuid_1")) {
      await orderCollection.dropIndex("transactionUuid_1");
      console.log("Removed obsolete transactionUuid order index");
    }

    console.log("Db connected successfully");
  } catch (error) {
    console.log(error);
  }
}


module.exports = connectDb;
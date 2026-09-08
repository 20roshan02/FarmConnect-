const Products = require("../model/productSchema");
const errorHandler = require("../utils/errorHandler");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const CATEGORY_ALIASES = {
  vegetable: "vegetables",
  vegetables: "vegetables",
  fruit: "fruits",
  fruits: "fruits",
  grain: "grains",
  grains: "grains",
  dairy: "dairy",
  other: "other",
};

function normalizeCategory(value) {
  if (!value) return "";

  return CATEGORY_ALIASES[String(value).trim().toLowerCase()] || "";
}

async function addProduct(req, res) {
  try {
    const {
      title,
      description,
      price,
      stock,
      category,
      location,
      unit,
    } = req.body;

    const normalizedCategory = normalizeCategory(category);

    if (!title || !description || !price || !stock || !normalizedCategory || !location) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!req.user || req.user.role !== "farmer") {
      return res.status(403).json({
        success: false,
        message: "Only farmers can add products",
      });
    }

    let imageUrl = null;
    let imagePublicId = null;

    
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "products",
      });

      imageUrl = result.secure_url;
      imagePublicId = result.public_id;

      
      fs.unlink(req.file.path, (err) => {
        if (err) console.log("Failed to delete local file:", err);
      });
    }

    const product = await Products.create({
      title,
      description,
      price,
      stock,
      images: imageUrl,
      category: normalizedCategory,
      location,
      unit: unit || "kg",
      farmer: req.user.id,
      cloudinary_id: imagePublicId, 
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });

  } catch (error) {
    return errorHandler(res, error);
  }
}

async function getProducts(req, res) {
  try {
    const products = await Products.find({
      status: "approved",
    });
    if (!products) {
      return res
        .status(404)
        .json({ success: false, message: "Products Not FOund" });
    }

    return res
      .status(201)
      .json({ success: true, message: "Products fetched successfull", products });
  } catch (error) {
    return errorHandler(res, error);
  }
}

async function getProductsById(req, res) {
  try {
    const { id } = req.params;

    const product = await Products.findById(id)
      .populate("farmer", "name email createdAt location")
      .lean();

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }

    // Fetch other products from the same farmer (up to 6, excluding this one)
    const relatedProducts = await Products.find({
      farmer: product.farmer?._id ?? product.farmer,
      status: "approved",
      _id: { $ne: product._id },
    })
      .limit(6)
      .select("title price images category unit stock location")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product,
      relatedProducts,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
}

async function getMyProducts(req, res) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const products = await Products.find({ farmer: req.user.id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Farmer products fetched successfully",
      products,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
}

async function updateProductsById(req, res) {
  try {
    const { id } = req.params;
    const nextCategory = req.body.category ? normalizeCategory(req.body.category) : undefined;

    const product = await Products.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (String(product.farmer) !== String(req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own products",
      });
    }

    const updatedPayload = {
      ...req.body,
      ...(nextCategory ? { category: nextCategory } : {}),
    };

    const updatedProduct = await Products.findByIdAndUpdate(id, updatedPayload, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    return errorHandler(res, error);
  }
}

async function deleteProducts(req, res) {
  try {
    const { id } = req.params;
    const product = await Products.findById(id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product Not Found" });
    }

    if (String(product.farmer) !== String(req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own products",
      });
    }

    await Products.findByIdAndDelete(id);

    return res
      .status(200)
      .json({ success: true, message: "product deleted successfull" });
  } catch (error) {
    return errorHandler(res, error);
  }
}

module.exports = {
  addProduct,
  getProducts,
  getProductsById,
  getMyProducts,
  updateProductsById,
  deleteProducts
};

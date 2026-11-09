import express from "express";
import {
  createExternalShop,
  listExternalShops,
  getExternalShop,
  updateExternalShop,
  requestShopDelivery,
  trackDelivery,
} from "../controllers/externalShopController.js";

const router = express.Router();

// Public delivery tracking
router.get("/api/delivery/track/:id", trackDelivery);

// External shop endpoints
router.post("/api/delivery/external/shops", createExternalShop);
router.get("/api/delivery/external/shops", listExternalShops);
router.get("/api/delivery/external/shops/:id", getExternalShop);
router.patch("/api/delivery/external/shops/:id", updateExternalShop);
router.post("/api/delivery/external/shops/:id/request", requestShopDelivery);

export default router;

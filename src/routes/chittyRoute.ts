import express from "express";
import { verifyToken } from "##/middlewares/verifyToken.js";
import {
  ChittyAuctionBid,
  GetAuctionBidId,
  getChitty,
  GetChittyAuctionBids,
  getChittyByid,
  joinChitty,
} from "##/controllers/chittyController.js";

const router = express.Router();

router.route("/getAllChitty").get(verifyToken, getChitty);
router.route("/getChitty/:id").get(verifyToken, getChittyByid);
router.route("/createChitty").post(verifyToken, joinChitty); 
router.route("/chitty_auction_bid").post(verifyToken, ChittyAuctionBid);
router.route("/get/chitty_bids/:id").get(verifyToken, GetChittyAuctionBids);
router.route("/get/chittyAuctionBidId/:chitty_id/:cycle_id").get(verifyToken, GetAuctionBidId);
export default router;
  
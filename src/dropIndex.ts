import mongoose from "mongoose";
import { SitePage } from "./models/SitePage.js";

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/foodcity";
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  try {
    await SitePage.collection.dropIndex("pageId_1");
    console.log("Dropped index pageId_1");
  } catch (e: any) {
    console.log("Could not drop pageId_1 index:", e.message);
  }
  process.exit(0);
}

run();

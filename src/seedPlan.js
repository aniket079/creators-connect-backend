import connectDB from "./config/db.js";
import Plan from "./models/Plan.js";

await connectDB();

await Plan.deleteMany();

await Plan.insertMany([
  { name: "Starter", price: 99, tokens: 100 },
  { name: "Pro", price: 299, tokens: 300, bonusTokens: 20 },
  { name: "Ultimate", price: 599, tokens: 700, bonusTokens: 99}
]);

console.log("Plans seeded");
process.exit();
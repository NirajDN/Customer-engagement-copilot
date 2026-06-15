import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const indianFirstNames = [
  "Amit", "Priya", "Rajesh", "Deepika", "Rohan", "Sneha", "Vikram", "Anjali", "Sanjay", "Pooja",
  "Rahul", "Neha", "Arjun", "Karan", "Kiran", "Divya", "Sunil", "Aishwarya", "Abhishek", "Shruti",
  "Varun", "Riya", "Vijay", "Swati", "Suresh", "Aditi", "Manoj", "Jyoti", "Pranav", "Ishita",
  "Ramesh", "Meera", "Gaurav", "Nisha", "Kartik", "Kriti", "Akash", "Tanya", "Harish", "Preeti"
];

const indianLastNames = [
  "Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Iyer", "Nair", "Reddy", "Mehta",
  "Malhotra", "Joshi", "Das", "Choudhury", "Sen", "Rao", "Pillai", "Bose", "Trivedi", "Shah",
  "Deshmukh", "Kulkarni", "Patil", "Shetty", "Menon", "Kapoor", "Chatterjee", "Banerjee", "Roy", "Nangia",
  "Sarin", "Mishra", "Pandey", "Dubey", "Saxena", "Sinha", "Prasad", "Naidu", "Gowda", "Bhat"
];

const domains = ["gmail.com", "yahoo.co.in", "outlook.in", "hotmail.com", "rediffmail.com", "proton.me"];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDateWithinDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  return date;
}

async function main() {
  console.log("Cleaning database...");
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.audienceSegment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  console.log("Seeding Indian customers...");
  const customers = [];

  // Generate 120 unique Indian customer profiles
  for (let i = 0; i < 120; i++) {
    const firstName = getRandomElement(indianFirstNames);
    const lastName = getRandomElement(indianLastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Math.floor(Math.random() * 1000)}@${getRandomElement(domains)}`;
    
    // Generate Indian mobile number (starts with 6, 7, 8, or 9)
    const mobilePrefix = getRandomElement(["6", "7", "8", "9"]);
    const rest = Math.floor(100000000 + Math.random() * 900000000).toString();
    const phone = `+91 ${mobilePrefix}${rest.slice(0, 4)} ${rest.slice(4)}`;
    
    const createdAt = getRandomDateWithinDays(365); // Created in the last year

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        createdAt
      }
    });
    customers.push(customer);
  }

  console.log(`Successfully seeded ${customers.length} Indian customers.`);

  console.log("Seeding transaction orders (in INR ₹)...");
  let orderCount = 0;

  for (const customer of customers) {
    const behavior = Math.random();
    let numOrders = 1;
    let minAmt = 500;   // ₹500
    let maxAmt = 2500;  // ₹2,500
    let dateLimit = 365; // days ago

    if (behavior < 0.15) {
      // VIP buyers: many high value orders
      numOrders = Math.floor(8 + Math.random() * 12);
      minAmt = 8000;   // ₹8,000
      maxAmt = 35000;  // ₹35,000
    } else if (behavior < 0.6) {
      // Regular buyers
      numOrders = Math.floor(3 + Math.random() * 6);
      minAmt = 1500;   // ₹1,500
      maxAmt = 8000;   // ₹8,000
    } else if (behavior < 0.85) {
      // Lapsed: purchased in the past but inactive in the last 60 days
      numOrders = Math.floor(2 + Math.random() * 4);
      minAmt = 1000;   // ₹1,000
      maxAmt = 5000;   // ₹5,000
      
      for (let j = 0; j < numOrders; j++) {
        const offsetDays = 60 + Math.floor(Math.random() * 300);
        const purchaseDate = new Date();
        purchaseDate.setDate(purchaseDate.getDate() - offsetDays);

        const amount = new Decimal((minAmt + Math.random() * (maxAmt - minAmt)).toFixed(2));
        const status = Math.random() < 0.95 ? "COMPLETED" : "REFUNDED";

        await prisma.order.create({
          data: {
            customerId: customer.id,
            amount,
            status,
            purchaseDate
          }
        });
        orderCount++;
      }
      continue; 
    } else {
      // Inactive/One-time buyers
      numOrders = 1;
      minAmt = 300;    // ₹300
      maxAmt = 1500;   // ₹1,500
    }

    // Seed orders for active customers
    for (let j = 0; j < numOrders; j++) {
      const purchaseDate = getRandomDateWithinDays(dateLimit);
      const amount = new Decimal((minAmt + Math.random() * (maxAmt - minAmt)).toFixed(2));
      const status = Math.random() < 0.9 ? "COMPLETED" : (Math.random() < 0.7 ? "PENDING" : "REFUNDED");

      await prisma.order.create({
        data: {
          customerId: customer.id,
          amount,
          status,
          purchaseDate
        }
      });
      orderCount++;
    }
  }

  console.log(`Successfully seeded ${orderCount} orders in Indian Rupees.`);
  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

const firstNames = [
  "John", "Jane", "Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah",
  "Ian", "Julia", "Kevin", "Laura", "Marcus", "Natalie", "Oliver", "Penelope", "Quincy", "Rachel",
  "Samuel", "Tina", "Victor", "Wendy", "Xavier", "Yasmine", "Zachary", "Liam", "Emma", "Noah",
  "Olivia", "William", "Ava", "James", "Sophia", "Logan", "Isabella", "Benjamin", "Mia", "Mason"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"
];

const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "protonmail.com"];

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

  console.log("Seeding customers...");
  const customers = [];

  // Generate 120 unique customers
  for (let i = 0; i < 120; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${Math.floor(Math.random() * 1000)}@${getRandomElement(domains)}`;
    const phone = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
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

  console.log(`Successfully seeded ${customers.length} customers.`);

  console.log("Seeding orders...");
  let orderCount = 0;

  // Let's create varying purchasing behavior
  for (const customer of customers) {
    // Determine customer buying behavior class:
    // 1. VIP: 10-20 orders, high amounts
    // 2. Regular: 3-9 orders, moderate amounts
    // 3. One-time/Inactive: 1 order, low amount
    // 4. Lapsed: bought several times in the past, but none in the last 60-90 days
    const behavior = Math.random();
    let numOrders = 1;
    let minAmt = 15;
    let maxAmt = 80;
    let dateLimit = 365; // days ago

    if (behavior < 0.15) {
      // VIP
      numOrders = Math.floor(10 + Math.random() * 11);
      minAmt = 80;
      maxAmt = 500;
    } else if (behavior < 0.6) {
      // Regular
      numOrders = Math.floor(3 + Math.random() * 7);
      minAmt = 30;
      maxAmt = 150;
    } else if (behavior < 0.85) {
      // Lapsed: bought several times in the past, but none recently
      numOrders = Math.floor(2 + Math.random() * 4);
      minAmt = 20;
      maxAmt = 100;
      // We will offset the date to ensure no orders in the last 60 days
      // Let's make orders between 60 and 365 days ago
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
      continue; // Skip the regular block for lapsed customers
    } else {
      // Inactive/One-time
      numOrders = 1;
      minAmt = 10;
      maxAmt = 50;
    }

    // Seed orders for non-lapsed customers
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

  console.log(`Successfully seeded ${orderCount} orders.`);
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

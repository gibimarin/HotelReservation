import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { RoomType } from '../models/RoomType';
import { DailyInventory } from '../models/DailyInventory';
import { Reservation } from '../models/Reservation';
import { UserRole } from '../constants/roles';

const seedDatabase = async () => {
  try {
    console.log('🌱 [Seeder] Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('🌱 [Seeder] Connected successfully.');

    // 1. Clear existing seed collections
    console.log('🧹 [Seeder] Cleaning existing test collections...');
    await Promise.all([
      User.deleteMany({}),
      RoomType.deleteMany({}),
      DailyInventory.deleteMany({}),
      Reservation.deleteMany({}),
    ]);
    console.log('🧹 [Seeder] Existing collections cleaned.');

    // 2. Seed Users
    console.log('👤 [Seeder] Creating demo users...');
    const users = await User.create([
      {
        name: 'Hotel Administrator',
        email: 'admin@hotel.com',
        password: 'AdminPassword123!',
        role: UserRole.ADMIN,
      },
      {
        name: 'Front Desk Staff',
        email: 'staff@hotel.com',
        password: 'StaffPassword123!',
        role: UserRole.STAFF,
      },
      {
        name: 'Jane Doe (Guest)',
        email: 'guest@hotel.com',
        password: 'GuestPassword123!',
        role: UserRole.GUEST,
      },
    ]);
    console.log(`👤 [Seeder] Created ${users.length} users.`);

    // 3. Seed Room Types
    console.log('🏨 [Seeder] Creating room types...');
    const roomTypes = await RoomType.create([
      {
        name: 'Deluxe King Room',
        description:
          'Spacious 42 sqm room featuring a plush king-size bed, private marble balcony, and panoramic city views. Perfect for couples or solo travelers seeking luxury and calm.',
        capacity: 2,
        facilities: [
          'King Bed',
          'Free High-Speed Wi-Fi',
          'Marble Bathroom',
          'Smart 55" 4K TV',
          'Espresso Machine',
          'Mini Bar',
          'Air Conditioning',
        ],
        pricePerNight: 180,
        totalInventory: 6,
        isActive: true,
        imageUrl:
          'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Executive Oceanfront Suite',
        description:
          'Luxurious 65 sqm suite with private oceanfront terrace, dedicated living lounge, walk-in dressing room, and deep soaking tub.',
        capacity: 3,
        facilities: [
          'King Bed + Sofa Bed',
          'Oceanfront Balcony',
          'Free High-Speed Wi-Fi',
          'Separate Living Area',
          'Deep Soaking Tub',
          'Nespresso Bar',
          'Walk-in Wardrobe',
        ],
        pricePerNight: 310,
        totalInventory: 4,
        isActive: true,
        imageUrl:
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Family Garden Suite',
        description:
          'Designed for families, offering two adjoining bedrooms (one King, two Twin beds), child-friendly amenities, and direct ground-level garden terrace access.',
        capacity: 4,
        facilities: [
          '1 King Bed + 2 Twin Beds',
          'Private Garden Terrace',
          '2 Full Bathrooms',
          'Kids Play Corner',
          'Kitchenette with Microwave',
          'High-Speed Wi-Fi',
        ],
        pricePerNight: 260,
        totalInventory: 5,
        isActive: true,
        imageUrl:
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      },
      {
        name: 'Presidential Penthouse',
        description:
          'The pinnacle of hospitality. 140 sqm duplex penthouse with 360-degree skyline views, private plunge pool, dining room for 8, and dedicated 24/7 butler service.',
        capacity: 6,
        facilities: [
          '2 Master Bedrooms',
          'Private Rooftop Plunge Pool',
          'Private Dining Room',
          '24/7 Butler Service',
          'Whirlpool Jacuzzi',
          'Wine Cellar',
        ],
        pricePerNight: 650,
        totalInventory: 2,
        isActive: true,
        imageUrl:
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      },
    ]);
    console.log(`🏨 [Seeder] Created ${roomTypes.length} room types.`);

    // 4. Initialize DailyInventory for the next 60 days
    console.log('📅 [Seeder] Generating 60-day daily inventory grid...');
    const inventoryDocs = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const inventoryDate = new Date(today);
      inventoryDate.setUTCDate(today.getUTCDate() + dayOffset);

      for (const room of roomTypes) {
        inventoryDocs.push({
          roomTypeId: room._id,
          date: inventoryDate,
          totalInventory: room.totalInventory,
          availableCount: room.totalInventory,
          reservedCount: 0,
        });
      }
    }

    await DailyInventory.insertMany(inventoryDocs);
    console.log(
      `📅 [Seeder] Generated ${inventoryDocs.length} daily inventory records across ${roomTypes.length} room types.`
    );

    console.log('\n===========================================');
    console.log('🎉 [Seeder] Database Seeded Successfully!');
    console.log('===========================================');
    console.log('Demo Credentials for Assessment:');
    console.log('  Admin:   admin@hotel.com   / AdminPassword123!');
    console.log('  Staff:   staff@hotel.com   / StaffPassword123!');
    console.log('  Guest:   guest@hotel.com   / GuestPassword123!');
    console.log('===========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seeder] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();


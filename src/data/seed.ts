import { INITIAL_API_URL } from '../config';
import type { Database, DishInput } from '../models/types';

// Fixed client IDs let a fresh installation reconcile the demo data with MockAPI.
const meta = { revision: 1, dirty: true, deleted: false, updatedAt: '2026-10-20T00:00:00.000Z' };
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;
export const SAMPLE_PHOTOS = {
  salad: photo('photo-1512621776951-a57141f2eefd'),
  pasta: photo('photo-1473093226795-af9932fe5856'),
  burger: photo('photo-1568901346375-23c9450c58cd'),
  pizza: photo('photo-1579751626657-72bc17010498'),
  pancakes: photo('photo-1528207776546-365bb710ee93'),
  dessert: photo('photo-1578985545062-69928b1d9587'),
};
export function seedDatabase(apiUrl = INITIAL_API_URL): Database {
  const categories = [
    {
      id: 'bit240094-starters',
      name: 'Starters',
      description: 'Fresh beginnings and light bites.',
    },
    { id: 'bit240094-mains', name: 'Main courses', description: 'The heart of a good meal.' },
    { id: 'bit240094-desserts', name: 'Desserts', description: 'Something sweet to finish.' },
  ].map((item) => ({ ...meta, ...item }));
  const items: (DishInput & { id: string })[] = [
    {
      id: 'bit240094-salad',
      name: 'Garden harvest salad',
      price: 65000,
      preparationTime: 10,
      isAvailable: true,
      description:
        'A colorful mix of seasonal greens, cherry tomatoes and crisp vegetables, finished with a bright lemon dressing.',
      dishCategoryId: categories[0].id,
      dishImage: [{ id: 'salad-1', imageUrl: SAMPLE_PHOTOS.salad, isThumbnail: true }],
    },
    {
      id: 'bit240094-pasta',
      name: 'Basil pesto pasta',
      price: 125000,
      preparationTime: 20,
      isAvailable: true,
      description:
        'Pasta tossed with fresh basil pesto, parmesan and a little extra virgin olive oil. Made to order.',
      dishCategoryId: categories[1].id,
      dishImage: [
        { id: 'pasta-1', imageUrl: SAMPLE_PHOTOS.pasta, isThumbnail: true },
        { id: 'pasta-2', imageUrl: SAMPLE_PHOTOS.salad, isThumbnail: false },
      ],
    },
    {
      id: 'bit240094-burger',
      name: 'House beef burger',
      price: 145000,
      preparationTime: 25,
      isAvailable: true,
      description:
        'Grilled beef, melted cheese and crunchy vegetables in a toasted bun. Served with our house sauce.',
      dishCategoryId: categories[1].id,
      dishImage: [{ id: 'burger-1', imageUrl: SAMPLE_PHOTOS.burger, isThumbnail: true }],
    },
    {
      id: 'bit240094-pizza',
      name: 'Classic margherita',
      price: 165000,
      preparationTime: 30,
      isAvailable: false,
      description:
        'A crisp crust with tomato sauce, mozzarella and basil. Temporarily unavailable while we prepare a new batch of dough.',
      dishCategoryId: categories[1].id,
      dishImage: [{ id: 'pizza-1', imageUrl: SAMPLE_PHOTOS.pizza, isThumbnail: true }],
    },
    {
      id: 'bit240094-pancakes',
      name: 'Sunday pancakes',
      price: 85000,
      preparationTime: 15,
      isAvailable: true,
      description:
        'Fluffy pancakes with a drizzle of syrup. A little comfort, any day of the week.',
      dishCategoryId: categories[2].id,
      dishImage: [{ id: 'pancakes-1', imageUrl: SAMPLE_PHOTOS.pancakes, isThumbnail: true }],
    },
    {
      id: 'bit240094-cake',
      name: 'Chocolate celebration cake',
      price: 75000,
      preparationTime: 8,
      isAvailable: true,
      description:
        'A slice of rich chocolate cake with a soft crumb and smooth chocolate frosting.',
      dishCategoryId: categories[2].id,
      dishImage: [{ id: 'cake-1', imageUrl: SAMPLE_PHOTOS.dessert, isThumbnail: true }],
    },
  ];
  return {
    version: 1,
    categories,
    dishes: items.map((item) => ({ ...meta, ...item })),
    settings: { language: 'en', apiUrl, apiConfigured: Boolean(apiUrl), lastSyncedAt: null },
  };
}

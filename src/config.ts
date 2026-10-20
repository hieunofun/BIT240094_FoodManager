// MSSV appears in the project name, every persisted field and both API resources.
export const STUDENT_ID = 'BIT240094';
export const PROJECT_NAME = `${STUDENT_ID}_FoodManager`;
export const STORAGE_KEY = `${STUDENT_ID}_FoodManager`;
export const RESOURCES = {
  categories: `${STUDENT_ID}_DishCategory`,
  dishes: `${STUDENT_ID}_Dish`,
} as const;
export const INITIAL_API_URL =
  process.env.EXPO_PUBLIC_MOCKAPI_URL?.trim().replace(/\/+$/, '') ?? '';

export function field(name: string) {
  return `${STUDENT_ID}_${name}`;
}

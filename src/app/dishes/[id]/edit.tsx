import { useLocalSearchParams } from 'expo-router';
import { DishForm } from '../../../components/DishForm';
export default function EditDish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DishForm editingId={id} />;
}

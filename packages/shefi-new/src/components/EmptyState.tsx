import { Text } from './Text';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Text size="lg" color="gray">
        {title}
      </Text>
      <Text size="sm" color="gray" className="mt-2">
        {description}
      </Text>
    </div>
  );
}

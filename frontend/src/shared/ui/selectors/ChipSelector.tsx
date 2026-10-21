import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import { Pressable, Text, View } from 'react-native';

interface ChipSelectorProps<T extends string> {
  label: string;
  options: readonly T[];
  selectedValue?: T;
  selectedValues?: T[];
  onSelect: (value: T) => void;
  translationKey: string;
  classNameSelector?: string;
  namespace?: string;
  maxSelected?: number;
  hint?: string;
  variant?: 'default' | 'outline' | 'segmented';
}

export function ChipSelector<T extends string>({
  label,
  options,
  selectedValue,
  selectedValues,
  onSelect,
  translationKey,
  classNameSelector = 'mb-4',
  namespace = 'profile',
  maxSelected,
  hint,
  variant = 'default',
}: ChipSelectorProps<T>) {
  const { t } = useTranslation(namespace);
  const isMulti = selectedValues != null;

  return (
    <View className={classNameSelector}>
      <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Text>
      {hint ? (
        <Text className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </Text>
      ) : null}
      <View
        className={
          variant === 'segmented'
            ? 'flex-row flex-wrap gap-1 self-start rounded-xl bg-slate-100 p-1 dark:bg-slate-800'
            : 'flex-row flex-wrap gap-2'
        }
      >
        {options.map((option) => {
          const isSelected = isMulti
            ? selectedValues.includes(option)
            : selectedValue === option;
          const atLimit =
            isMulti &&
            maxSelected != null &&
            selectedValues.length >= maxSelected &&
            !isSelected;

          return (
            <Pressable
              key={option}
              onPress={() => {
                if (atLimit) return;
                onSelect(option);
              }}
              disabled={atLimit}
              className={
                variant !== 'default'
                  ? `${variant === 'segmented' ? 'rounded-lg' : 'rounded-full border'} min-h-11 items-center justify-center px-4 py-2 ${isSelected ? (variant === 'segmented' ? 'bg-blue-600 shadow-sm' : 'border-blue-500 bg-blue-50 dark:bg-blue-950') : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`
                  : `rounded-full px-3 py-1.5 ${
                      isSelected
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : atLimit
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'bg-gray-200 dark:bg-gray-700'
                    }`
              }
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: atLimit }}
            >
              <Text
                className={
                  variant === 'outline' && isSelected
                    ? 'text-sm font-medium text-blue-600 dark:text-blue-300'
                    : isSelected
                      ? 'text-sm font-semibold text-white'
                      : atLimit
                        ? 'text-sm text-gray-400 dark:text-gray-500'
                        : 'text-sm text-gray-700 dark:text-gray-300'
                }
              >
                {t(`${translationKey}.${option}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

import { CURRENCIES, type Currency } from '@/features/jobs/model';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColorScheme } from 'nativewind';

interface CurrencyPickerProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  label: string;
  error?: string;
  touched?: boolean;
}

export const CurrencyPicker = ({
  value,
  onChange,
  label,
  error,
  touched,
}: CurrencyPickerProps) => {
  const { colorScheme } = useColorScheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ['40%'], []);

  const isDark = colorScheme === 'dark';

  const handleOpen = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const handleSelectCurrency = useCallback(
    (currency: Currency) => {
      onChange(currency);
      handleClose();
    },
    [onChange, handleClose]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <View className="mb-0">
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      )}
      <Pressable
        onPress={handleOpen}
        className="rounded-lg border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-800"
      >
        <Text className="text-base text-gray-900 dark:text-white">{value}</Text>
      </Pressable>
      {touched && error && (
        <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </Text>
      )}

      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        }}
        handleIndicatorStyle={{
          backgroundColor: '#9CA3AF',
        }}
      >
        <BottomSheetView className="flex-1 px-4">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {label}
          </Text>
          {CURRENCIES.map((currency) => {
            const isSelected = currency === value;
            return (
              <Pressable
                key={currency}
                onPress={() => handleSelectCurrency(currency)}
                className={`mb-2 rounded-lg border px-4 py-3 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-base ${
                    isSelected
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {currency}
                </Text>
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

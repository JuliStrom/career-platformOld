import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useColorScheme } from 'nativewind';

interface PasswordFieldProps extends Omit<TextInputProps, 'secureTextEntry'> {
  error?: string;
  label: string;
  margin?: string;
  labelClassName?: string;
  errorClassName?: string;
}

const defaultLabelClassName =
  'mb-2 text-sm font-medium text-gray-700 dark:text-gray-300';
const defaultErrorClassName = 'mt-1 text-sm text-red-600 dark:text-red-400';

const rowClassName =
  'flex-row items-center overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800';
const inputClassName =
  'min-h-[48px] flex-1 px-4 py-3 text-base text-gray-900 dark:text-white';

export function PasswordField({
  error,
  label,
  nativeID,
  margin = 'mb-4',
  labelClassName = defaultLabelClassName,
  errorClassName = defaultErrorClassName,
  placeholderTextColor = '#9CA3AF',
  ...textInputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation('auth');
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <View className={margin}>
      {label ? (
        <Text
          className={labelClassName}
          nativeID={nativeID}
          accessibilityRole="text"
        >
          {label}
        </Text>
      ) : null}
      <View className={rowClassName}>
        <TextInput
          className={inputClassName}
          placeholderTextColor={placeholderTextColor}
          accessibilityLabelledBy={nativeID}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...textInputProps}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? t('accessibility.hidePassword')
              : t('accessibility.showPassword')
          }
          hitSlop={12}
          className="justify-center px-3 py-2"
        >
          <MaterialIcons
            name={visible ? 'visibility-off' : 'visibility'}
            size={22}
            color={iconColor}
          />
        </Pressable>
      </View>
      {error ? <Text className={errorClassName}>{error}</Text> : null}
    </View>
  );
}

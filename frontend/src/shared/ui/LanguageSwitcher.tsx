import { setLanguage, SUPPORTED_LANGUAGES } from '@/shared/config/i18n';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const labels = { ru: 'RU', kk: 'KZ', uz: 'UZ', en: 'EN' };

export function LanguageSwitcher() {
  const { t, currentLanguage } = useTranslation('common');
  const currentLang = currentLanguage?.split('-')[0] || 'ru';
  const triggerRef = useRef<View>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const { width, height } = useWindowDimensions();
  const close = () => setPosition(null);

  function open() {
    triggerRef.current?.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setPosition({
        top: Math.max(8, Math.min(y + triggerHeight + 4, height - 192)),
        left: Math.max(8, Math.min(x + triggerWidth - 96, width - 104)),
      });
    });
  }

  return (
    <View>
      <Pressable
        ref={triggerRef}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={t('language')}
        accessibilityState={{ expanded: position !== null }}
        className="min-h-11 flex-row items-center gap-2 rounded-lg px-2 active:bg-blue-100 dark:active:bg-blue-900"
      >
        <MaterialIcons name="language" size={22} color="#3b82f6" />
        <Text className="text-sm font-medium text-blue-500">
          {labels[currentLang as keyof typeof labels] ?? 'RU'}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={18} color="#3b82f6" />
      </Pressable>
      <Modal
        visible={position !== null}
        transparent
        animationType="fade"
        onRequestClose={close}
        onOrientationChange={close}
      >
        <View className="flex-1">
          <Pressable
            style={{ position: 'absolute', inset: 0 }}
            onPress={close}
            accessible={false}
          />
          {position && (
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={close}
              className="overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
              style={{ position: 'absolute', ...position, width: 96 }}
            >
              {SUPPORTED_LANGUAGES.map((language) => {
                const selected = currentLang === language;
                return (
                  <Pressable
                    key={language}
                    onPress={() => {
                      close();
                      void setLanguage(language);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={labels[language]}
                    accessibilityState={{ selected }}
                    className="min-h-11 justify-center px-5 active:bg-gray-100 dark:active:bg-gray-700"
                  >
                    <Text
                      className={`text-sm ${selected ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                      {labels[language]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

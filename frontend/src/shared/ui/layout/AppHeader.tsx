import { LanguageSwitcher } from '@/shared/ui/LanguageSwitcher';
import { Image, View } from 'react-native';

const logo = require('../../../../assets/images/logo-header.png');
const emblem = require('../../../../assets/images/header-emblem.png');

export function AppHeader({ transparent = false }: { transparent?: boolean }) {
  return (
    <View
      className={`w-full flex-row flex-wrap items-center justify-between gap-3 border-b px-4 py-3 ${transparent ? 'border-white/20 bg-transparent' : 'border-hairline bg-header dark:border-hairline-dark dark:bg-header-dark'}`}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        accessible
        accessibilityRole="image"
        accessibilityLabel="cntrbute"
      >
        <Image
          source={emblem}
          style={{ width: 36, height: 36, borderRadius: 9 }}
          accessible={false}
        />
        <View style={{ width: 202, height: 44, overflow: 'hidden' }}>
          <Image
            source={logo}
            resizeMode="contain"
            style={{
              width: 244,
              height: 44,
              position: 'absolute',
              left: -39,
              tintColor: '#85b2ff',
            }}
            accessible={false}
          />
        </View>
      </View>
      <LanguageSwitcher light={transparent} />
    </View>
  );
}

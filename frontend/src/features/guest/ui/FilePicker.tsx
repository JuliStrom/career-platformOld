import { Platform, Pressable, Text, View } from 'react-native';
import { useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { ResumeFile } from '../model/analysis';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from '@/shared/lib/hooks/useTranslation';

interface FilePickerProps {
  fileName: string | null;
  onFileSelected: (file: ResumeFile) => void;
  label: string;
  hint: string;
}

/**
 * Выбор файла резюме (PDF/DOCX).
 * На web — <input type="file">, на native — expo-document-picker.
 */
export function FilePicker({
  fileName,
  onFileSelected,
  label,
  hint,
}: FilePickerProps) {
  const { t } = useTranslation('guest');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const content = (
    <View className="items-center gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
        <MaterialIcons
          name={fileName ? 'description' : 'cloud-upload'}
          size={22}
          color="#5287ff"
        />
      </View>
      <Text className="text-center text-sm font-medium text-slate-700 dark:text-slate-200">
        {fileName ?? t('upload.file.drop')}
      </Text>
      {!fileName && (
        <Text className="text-xs text-slate-400">{t('upload.file.or')}</Text>
      )}
      <View className="min-h-11 items-center justify-center rounded-lg border border-blue-200 bg-white px-5 py-2 dark:border-slate-600 dark:bg-slate-800">
        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </Text>
      </View>
      <Text className="text-center text-xs text-slate-400">{hint}</Text>
    </View>
  );

  const selectWebFile = (file?: File) => {
    if (file)
      onFileSelected({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        file,
      });
  };
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectWebFile(event.target.files?.[0]);
    event.target.value = '';
  };
  const pickFile = async () => {
    if (Platform.OS === 'web') {
      inputRef.current?.click();
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      onFileSelected({
        name: asset.name,
        size: asset.size || 0,
        uri: asset.uri,
        mimeType: asset.mimeType || 'application/octet-stream',
      });
    }
  };
  const button = (
    <Pressable
      onPress={pickFile}
      accessibilityRole="button"
      className="w-full rounded-2xl border border-dashed border-blue-200 bg-slate-50 px-5 py-7 dark:border-slate-600 dark:bg-slate-800/50"
    >
      {content}
    </Pressable>
  );

  return (
    <View className="mb-8 w-full">
      <Text className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </Text>

      {Platform.OS === 'web' ? (
        <div
          style={{ width: '100%', minWidth: 0 }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectWebFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          {button}
        </div>
      ) : (
        button
      )}
    </View>
  );
}

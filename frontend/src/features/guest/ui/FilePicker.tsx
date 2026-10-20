import { Platform, Pressable, Text, View } from 'react-native';
import { useRef } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { ResumeFile } from '../model/analysis';

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        file,
      });
    }
    // сброс, чтобы можно было выбрать тот же файл повторно
    event.target.value = '';
  };

  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </Text>
      <Text className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        {hint}
      </Text>

      {Platform.OS === 'web' ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          <Pressable
            onPress={() => inputRef.current?.click()}
            className="rounded-lg border border-dashed border-gray-400 bg-white px-4 py-6 dark:border-gray-600 dark:bg-gray-800"
            accessibilityRole="button"
          >
            <Text className="text-center text-base text-gray-700 dark:text-gray-300">
              {fileName ?? label}
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
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
          }}
          className="rounded-lg border border-dashed border-gray-400 bg-white px-4 py-6 dark:border-gray-600 dark:bg-gray-800"
        >
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            {fileName ?? label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

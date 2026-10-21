import { useAuthStore } from '@/features/auth/store/auth.store';
import { useEmployerStore } from '@/features/employer/store/employer-store';
import { CompanyForm } from '@/features/employer/ui/CompanyForm';
import { CompanyProfile } from '@/features/employer/ui/CompanyProfile';
import { UserType } from '@/shared/model';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmployerProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const userType = useAuthStore((state) => state.user?.userType);
  const company = useEmployerStore((state) => state.company);
  const companyHydrated = useEmployerStore((state) => state.companyHydrated);
  const isLoadingCompany = useEmployerStore((state) => state.isLoadingCompany);
  const isSavingCompany = useEmployerStore((state) => state.isSavingCompany);
  const error = useEmployerStore((state) => state.error);
  const fetchCompany = useEmployerStore((state) => state.fetchCompany);
  const saveCompany = useEmployerStore((state) => state.saveCompany);

  useEffect(() => {
    void fetchCompany();
  }, [fetchCompany]);

  if (!userType) {
    return <Redirect href="/choose-path" />;
  }
  if (userType !== UserType.EMPLOYER) {
    return <Redirect href="/jobs" />;
  }

  const handleSave = async (payload: Parameters<typeof saveCompany>[0]) => {
    try {
      await saveCompany(payload);
      setIsEditing(false);
    } catch {
      // store already keeps error
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      edges={['top', 'bottom']}
    >
      {(!companyHydrated || isLoadingCompany) && !company ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : company && !isEditing ? (
        <CompanyProfile company={company} onEdit={() => setIsEditing(true)} />
      ) : (
        <CompanyForm
          initialValues={company ?? undefined}
          isLoading={isLoadingCompany || isSavingCompany}
          error={error}
          onSubmit={handleSave}
        />
      )}
    </SafeAreaView>
  );
}

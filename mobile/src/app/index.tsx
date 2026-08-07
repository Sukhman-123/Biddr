import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { environment } from '@/config/environment';
import { useApiHealth } from '@/features/health/use-api-health';
import { colors } from '@/theme/colors';

export default function HomeScreen() {
  const health = useApiHealth();
  const isConnected = health.data?.status === 'ok';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>B</Text>
        </View>

        <Text style={styles.eyebrow}>BIDDR MOBILE</Text>
        <Text style={styles.title}>Your auction room, wherever you are.</Text>
        <Text style={styles.subtitle}>
          The mobile foundation is ready. This check confirms that the app can reach the Biddr API.
        </Text>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? colors.success : health.isError ? colors.danger : colors.warning },
              ]}
            />
            <View style={styles.statusCopy}>
              <Text style={styles.statusTitle}>
                {health.isPending
                  ? 'Checking API…'
                  : isConnected
                    ? 'Biddr API connected'
                    : 'API connection needed'}
              </Text>
              <Text style={styles.statusDetail} numberOfLines={2}>
                {health.isError
                  ? 'Check EXPO_PUBLIC_API_URL and confirm the server is reachable from this device.'
                  : health.data?.app ?? environment.apiUrl}
              </Text>
            </View>
            {health.isFetching && <ActivityIndicator color={colors.accent} />}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={health.isFetching}
            onPress={() => health.refetch()}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Test connection</Text>
          </Pressable>
        </View>

        <View style={styles.phaseCard}>
          <Text style={styles.phaseTitle}>Foundation prepared</Text>
          <Text style={styles.phaseItem}>• Expo Router and TypeScript</Text>
          <Text style={styles.phaseItem}>• Secure token storage</Text>
          <Text style={styles.phaseItem}>• Axios API client</Text>
          <Text style={styles.phaseItem}>• Socket.IO client factory</Text>
          <Text style={styles.phaseItem}>• React Query server state</Text>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  brandLetter: {
    color: colors.background,
    fontSize: 30,
    fontWeight: '900',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 30,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  statusDetail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 20,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  phaseCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
  },
  phaseTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 10,
  },
  phaseItem: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 23,
  },
});

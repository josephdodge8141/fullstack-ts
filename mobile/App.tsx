import { Platform, SafeAreaView, StyleSheet } from 'react-native';

import type { HealthResponse } from '@app/schemas';

import { fetchHealth } from '../frontend/services/health';
import WebApp from './WebApp';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl;

async function requestHealth(): Promise<HealthResponse> {
  return fetchHealth({ endpoint: `${apiUrl}/api/v1/health` });
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <WebApp requestHealth={requestHealth} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });

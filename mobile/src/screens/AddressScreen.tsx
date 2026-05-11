import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../lib/api';
import { colors, font } from '../lib/tokens';

interface AddressData {
  zipCode: string | null;
  street: string | null;
  streetNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
}

interface Props {
  initial: AddressData;
  onClose: () => void;
}

export function AddressScreen({ initial, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const [zipCode, setZipCode] = useState(initial.zipCode ?? '');
  const [street, setStreet] = useState(initial.street ?? '');
  const [streetNumber, setStreetNumber] = useState(initial.streetNumber ?? '');
  const [complement, setComplement] = useState(initial.complement ?? '');
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? '');
  const [deliveryCity, setDeliveryCity] = useState(initial.deliveryCity ?? '');
  const [deliveryState, setDeliveryState] = useState(initial.deliveryState ?? '');

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, '');
    setZipCode(cep);
    if (cep.length !== 8) return;

    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await res.json()) as Record<string, string>;
      if (data.erro) {
        Alert.alert('CEP não encontrado');
        return;
      }
      setStreet(data.logradouro ?? '');
      setNeighborhood(data.bairro ?? '');
      setDeliveryCity(data.localidade ?? '');
      setDeliveryState(data.uf ?? '');
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar o CEP.');
    } finally {
      setFetchingCep(false);
    }
  }

  async function save() {
    const missing =
      !zipCode || !street || !streetNumber || !neighborhood || !deliveryCity || !deliveryState;
    if (missing) {
      Alert.alert('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/profile/address', {
        zipCode,
        street,
        streetNumber,
        complement: complement || undefined,
        neighborhood,
        deliveryCity,
        deliveryState,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o endereço.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Pressable onPress={onClose}>
          <Text style={s.cancel}>Cancelar</Text>
        </Pressable>
        <Text style={s.title}>ENDEREÇO</Text>
        <Pressable onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator size={14} color={colors.brand} />
          ) : (
            <Text style={s.saveBtn}>Salvar</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 32 + insets.bottom }]}>
        <Text style={s.hint}>Endereço utilizado para envio da sua medalha física.</Text>

        {/* CEP */}
        <View style={s.field}>
          <Text style={s.label}>CEP *</Text>
          <View style={s.cepRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={zipCode}
              onChangeText={lookupCep}
              keyboardType="numeric"
              maxLength={8}
              placeholder="00000000"
              placeholderTextColor={colors.textMute}
              selectionColor={colors.brand}
            />
            {fetchingCep && <ActivityIndicator color={colors.brand} style={{ marginLeft: 10 }} />}
          </View>
        </View>

        <Field
          label="Rua / Logradouro *"
          value={street}
          onChangeText={setStreet}
          autoCapitalize="words"
        />
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Número *"
              value={streetNumber}
              onChangeText={setStreetNumber}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Complemento"
              value={complement}
              onChangeText={setComplement}
              placeholder="Apto, bloco..."
            />
          </View>
        </View>
        <Field
          label="Bairro *"
          value={neighborhood}
          onChangeText={setNeighborhood}
          autoCapitalize="words"
        />
        <View style={s.row}>
          <View style={{ flex: 2 }}>
            <Field
              label="Cidade *"
              value={deliveryCity}
              onChangeText={setDeliveryCity}
              autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="UF *"
              value={deliveryState}
              onChangeText={(v) => setDeliveryState(v.toUpperCase())}
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'characters';
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'none'}
        maxLength={maxLength}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.textMute}
        selectionColor={colors.brand}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.5,
  },
  cancel: { fontFamily: font.body, fontSize: 15, color: colors.textMute },
  saveBtn: { fontFamily: font.bodyBold, fontSize: 15, color: colors.brand },
  body: { padding: 20, gap: 16 },
  hint: { fontFamily: font.body, fontSize: 13, color: colors.textMute, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  cepRow: { flexDirection: 'row', alignItems: 'center' },
  field: { gap: 6 },
  label: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: colors.textMute,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.body,
    fontSize: 15,
    color: colors.text,
  },
});

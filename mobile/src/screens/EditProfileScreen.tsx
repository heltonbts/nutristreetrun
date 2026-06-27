import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

const BIO_MAX = 150;
const FEATURED_MAX = 6;
const MONTHS_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

export interface EditableMedal {
  id: string;
  year: number;
  month: number;
  title: string;
  status: 'PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'MISSED';
}

interface Props {
  initial: {
    name: string;
    phone: string;
    city: string | null;
    state: string | null;
    assessoria: string | null;
    bio: string | null;
    featuredMedalIds: string[];
    weightKg: number | null;
    heightCm: number | null;
  };
  medals: EditableMedal[];
  onClose: () => void;
}

export function EditProfileScreen({ initial, medals, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [city, setCity] = useState(initial.city ?? '');
  const [state, setState] = useState(initial.state ?? '');
  const [assessoria, setAssessoria] = useState(initial.assessoria ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [featured, setFeatured] = useState<string[]>(initial.featuredMedalIds ?? []);
  const [weight, setWeight] = useState(initial.weightKg != null ? String(initial.weightKg) : '');
  const [height, setHeight] = useState(initial.heightCm != null ? String(initial.heightCm) : '');

  // Só medalhas conquistadas podem virar destaque.
  const earned = medals.filter((m) => m.status === 'SHIPPED' || m.status === 'DELIVERED');

  function toggleFeatured(id: string) {
    setFeatured((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= FEATURED_MAX) {
        Alert.alert('Limite', `Você pode destacar até ${FEATURED_MAX} conquistas.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório');
      return;
    }
    setSaving(true);
    try {
      const weightNum = parseFloat(weight.replace(',', '.'));
      const heightNum = parseInt(height, 10);
      await api.patch('/profile', {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        assessoria: assessoria.trim() || undefined,
        bio: bio.trim(),
        featuredMedalIds: featured,
        weightKg: weight.trim() && !isNaN(weightNum) ? weightNum : undefined,
        heightCm: height.trim() && !isNaN(heightNum) ? heightNum : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={s.topBar}>
        <Pressable onPress={onClose}>
          <Text style={s.cancel}>Cancelar</Text>
        </Pressable>
        <Text style={s.title}>EDITAR PERFIL</Text>
        <Pressable onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator size={14} color={colors.brand} />
          ) : (
            <Text style={s.save}>Salvar</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Cidade" value={city} onChangeText={setCity} autoCapitalize="words" />
        <Field
          label="Estado (UF)"
          value={state}
          onChangeText={(v) => setState(v.toUpperCase())}
          maxLength={2}
          autoCapitalize="characters"
        />
        <Field
          label="Assessoria"
          value={assessoria}
          onChangeText={setAssessoria}
          autoCapitalize="words"
          placeholder="Opcional"
        />

        {/* Bio */}
        <View style={s.field}>
          <View style={s.bioLabelRow}>
            <Text style={s.label}>Bio</Text>
            <Text style={s.bioCounter}>
              {bio.length}/{BIO_MAX}
            </Text>
          </View>
          <TextInput
            style={[s.input, s.bioInput]}
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
            placeholder="Fale um pouco sobre você, suas metas, seu pace..."
            placeholderTextColor={colors.textMute}
            selectionColor={colors.brand}
            multiline
            maxLength={BIO_MAX}
            textAlignVertical="top"
          />
        </View>

        {/* Destaques (conquistas) */}
        <View style={s.field}>
          <View style={s.bioLabelRow}>
            <Text style={s.label}>Conquistas em destaque</Text>
            <Text style={s.bioCounter}>
              {featured.length}/{FEATURED_MAX}
            </Text>
          </View>
          {earned.length === 0 ? (
            <Text style={s.featuredEmpty}>
              Você ainda não tem medalhas conquistadas pra destacar.
            </Text>
          ) : (
            <View style={s.medalGrid}>
              {earned.map((m) => {
                const on = featured.includes(m.id);
                return (
                  <Pressable
                    key={m.id}
                    style={[s.medalChip, on && s.medalChipOn]}
                    onPress={() => toggleFeatured(m.id)}
                  >
                    <Text style={s.medalEmoji}>🏅</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.medalTitle, on && { color: colors.text }]} numberOfLines={1}>
                        {m.title}
                      </Text>
                      <Text style={s.medalSub}>
                        {MONTHS_SHORT[m.month - 1]}/{m.year}
                      </Text>
                    </View>
                    <View style={[s.medalCheck, on && s.medalCheckOn]}>
                      {on && <Text style={s.medalCheckMark}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Peso (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="Ex: 70.5"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Field
              label="Altura (cm)"
              value={height}
              onChangeText={setHeight}
              keyboardType="number-pad"
              placeholder="Ex: 175"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  keyboardType?: 'default' | 'phone-pad' | 'decimal-pad' | 'number-pad';
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
  root: { flex: 1, backgroundColor: colors.bg, paddingBottom: 0 },
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
  save: { fontFamily: font.bodyBold, fontSize: 15, color: colors.brand },
  body: { padding: 20, gap: 16 },
  row: { flexDirection: 'row' },
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
  bioLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bioCounter: { fontFamily: font.body, fontSize: 11, color: colors.textMute },
  bioInput: { minHeight: 84, lineHeight: 20 },
  featuredEmpty: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.textMute,
    lineHeight: 18,
    paddingVertical: 4,
  },
  medalGrid: { gap: 8 },
  medalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  medalChipOn: { borderColor: colors.brand, backgroundColor: colors.cardHi },
  medalEmoji: { fontSize: 18 },
  medalTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.textDim },
  medalSub: { fontFamily: font.body, fontSize: 11, color: colors.textMute, marginTop: 1 },
  medalCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalCheckOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  medalCheckMark: { color: colors.brandInk, fontSize: 13, fontFamily: font.bodyBold },
});

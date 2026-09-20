import React, { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, Linking } from 'react-native';
import { Text } from './primitives/Text';
import { ChatInteraction, InteractionChoice, formatMoney } from '../lib/interaction';

type Props = { interaction: ChatInteraction; disabled?: boolean; onSelect: (choice: InteractionChoice) => void };
function FieldInput({ component, disabled, onSelect }: { component: any } & Omit<Props, 'interaction'>) {
  const [value, setValue] = useState('');
  const field = component.field;
  const send = (selected: unknown, title: string) => onSelect({ id: `field:${field.path}`, kind: 'generic', title,
    prompt: title, groupId: 'fields', fieldPath: field.path, value: selected });
  const submit = () => send(['number', 'integer'].includes(field.type) ? Number(value) : value, value);
  return <View style={styles.card}>
    <Text style={styles.title}>{field.title}</Text>
    {field.enum ? field.enum.map((choice: any) => <Pressable key={String(choice)} disabled={disabled} style={styles.button}
      onPress={() => send(choice, String(choice))}><Text style={styles.text}>{String(choice)}</Text></Pressable>) : <>
      <TextInput accessibilityLabel={field.title} placeholder={field.format === 'date' ? 'YYYY-MM-DD' : field.title}
        placeholderTextColor="#8994AE" style={styles.input} value={value} onChangeText={setValue} editable={!disabled}
        keyboardType={['number','integer'].includes(field.type) ? 'numeric' : field.format === 'email' ? 'email-address' : 'default'}
        onSubmitEditing={submit} />
      <Pressable accessibilityRole="button" disabled={disabled || !value.trim()} onPress={submit} style={styles.button}>
        <Text style={styles.text}>Yuborish</Text>
      </Pressable>
    </>}
  </View>;
}

export function UniversalRenderer({ interaction, disabled, onSelect }: Props) {
  return <View style={styles.root}>{(interaction.components || []).map((component, index) => {
    const key = `${component.type}:${component.field?.path || component.offering?.id || index}`;
    if (['FieldInput','DateInput','LocationInput'].includes(component.type)) return <FieldInput key={key} component={component} disabled={disabled} onSelect={onSelect} />;
    if (component.type === 'OfferingCard') {
      const offering = component.offering;
      return <Pressable key={key} style={styles.card} accessibilityRole="button" disabled={disabled}
        onPress={() => onSelect({ id: offering.id, offeringId: offering.id, providerSlug: component.providerSlug, kind: 'offering',
          title: offering.title, prompt: offering.title, groupId: 'offerings' })}>
        <Text style={styles.title}>{offering.title}</Text>
        {offering.description ? <Text style={styles.text}>{offering.description}</Text> : null}
        <Text style={styles.text}>{formatMoney(offering.basePrice, offering.currency)}</Text>
      </Pressable>;
    }
    if (['VariantSelector','OptionSelector'].includes(component.type)) return <View key={key} style={styles.card}>
      <Text style={styles.title}>{component.field.title}</Text>
      {(component.choices || []).map((choice: any) => <Pressable key={choice.id} style={styles.button} disabled={disabled}
        onPress={() => onSelect({ id: choice.id, kind: 'generic', title: choice.name, prompt: choice.name, groupId: 'fields',
          fieldPath: component.field.path, value: choice.id })}>
        <Text style={styles.text}>{choice.name}{typeof choice.basePrice === 'number' ? ` — ${formatMoney(choice.basePrice, component.currency)}` : ''}</Text>
      </Pressable>)}
    </View>;
    if (component.type === 'QuoteSummary') return <View key={key} style={styles.card}>
      {(component.quote.lines || []).map((line: any, i: number) => <Text key={i} style={styles.text}>{line.offeringTitle} {line.variantTitle || ''} × {line.quantity} — {formatMoney(line.lineTotal, component.quote.currency)}</Text>)}
      {(component.quote.fees || []).map((fee: any, i: number) => <Text key={`fee:${i}`} style={styles.text}>{fee.name}: {formatMoney(fee.amount, component.quote.currency)}</Text>)}
      <Text style={styles.title}>Jami: {formatMoney(component.quote.total, component.quote.currency)}</Text>
    </View>;
    if (component.type === 'ConfirmationCard') return <View key={key} style={styles.card}>
      {['Tasdiqlayman', 'Yo‘q', 'Bekor qil'].map(title => <Pressable key={title} style={styles.button} disabled={disabled}
        onPress={() => onSelect({ id: title, kind: 'generic', title, prompt: title, groupId: `order:${component.quoteId}` })}><Text style={styles.text}>{title}</Text></Pressable>)}
    </View>;
    if (component.type === 'ActionStatusCard') return <View key={key} style={styles.card}>
      <Text style={styles.title}>{component.action.providerName || 'So‘rov'}</Text>
      <Text style={styles.text}>{component.action.status}</Text>
      <Pressable style={styles.button} disabled={disabled} onPress={() => onSelect({ id: 'status', kind: 'generic', title: 'Holat', prompt: 'Holat', groupId: 'status' })}><Text style={styles.text}>Holatni tekshirish</Text></Pressable>
    </View>;
    if (component.type === 'PaymentCard' && /^https:\/\//i.test(component.payment?.url || '')) return <Pressable key={key} style={styles.button}
      accessibilityRole="link" disabled={disabled} onPress={() => Linking.openURL(component.payment.url)}><Text style={styles.text}>Provider sahifasida davom etish</Text></Pressable>;
    return null;
  })}</View>;
}
const styles = StyleSheet.create({
  root: { gap: 10, width: '100%' },
  card: { padding: 14, borderRadius: 16, backgroundColor: '#151B2D', gap: 8 },
  title: { color: '#F4F6FC', fontSize: 15, fontWeight: '700' },
  text: { color: '#CCD3E5', fontSize: 14, lineHeight: 21 },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#30285A' },
  input: { color: '#F4F6FC', borderColor: '#5C6381', borderWidth: 1, padding: 12, borderRadius: 10 },
});

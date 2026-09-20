import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConversationState, ConversationField, emptyConversationState, ProviderCapability, CustomerContactSchema } from '@zayuno/contracts';
import { conversationRequirements, manifestOf, writeField, validateSlot,
  formatCustomerQuote, formatCustomerActionConfirmation, formatCustomerActionStatus,
  isDemoOrSandboxProvider } from '@zayuno/shared';
import { ProvidersService } from '../../providers/providers.service';
import { CatalogService } from '../../catalog/catalog.service';
import { QuotesService } from '../../quotes/quotes.service';
import { ActionsService } from '../../actions/actions.service';
import { RedisService } from '../../../common/services/redis.service';
import { ConsumerMemoryService } from '../memory/consumer-memory.service';
import { UnmetDemandService } from '../../analytics/unmet-demand.service';
import { ConversationStore } from './conversation-store';
import { SemanticIntentResolver, SemanticTurn } from './semantic-intent';

type ChatRequest = { prompt: string; userId: string; userEmail?: string; conversationId?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  selections?: Array<{ id?: string; kind?: string; providerSlug?: string; offeringId?: string; variantId?: string;
    quantity?: number; groupId?: string; title?: string; fieldPath?: string; value?: unknown }> };
type ChatResult = { content: string; interaction?: any };

@Injectable()
export class ConsumerChatService {
  private readonly store: ConversationStore;
  private readonly resolver = new SemanticIntentResolver();
  constructor(private readonly providersService: ProvidersService, private readonly catalogService: CatalogService,
    private readonly quotesService: QuotesService, private readonly actionsService: ActionsService,
    redisService: RedisService, private readonly memoryService?: ConsumerMemoryService,
    private readonly unmetDemandService?: UnmetDemandService) {
    this.store = new ConversationStore(redisService);
  }

  async getQuickActions() {
    const providers = await this.visibleProviders();
    return { actions: providers.slice(0, 3).map(provider => ({ key: `provider:${provider.slug}`, type: 'catalog',
      label: provider.branding?.displayName || provider.name, prompt: `${provider.name} katalogini ko‘rsat` })) };
  }
  async processMessage(input: ChatRequest): Promise<ChatResult> {
    if (typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 1200) throw new BadRequestException('Xabar 1–1200 belgi bo‘lishi kerak.');
    if ((input.selections?.filter(selection => selection.kind === 'offering').length || 0) > 1) throw new BadRequestException('Bir vaqtda bitta taklif tanlang.');
    return this.store.run(input.userId, input.conversationId, (state, save) => this.turn(input, state, save));
  }
  async streamMessage(input: ChatRequest, onDelta: (content: string) => void, onInteraction?: (interaction: any) => void): Promise<string> {
    const result = await this.processMessage(input);
    if (result.interaction) onInteraction?.(result.interaction);
    onDelta(result.content);
    return result.content;
  }
  private async visibleProviders() {
    // ProviderEnvironment defaults to LIVE at the contract boundary. Keep that
    // default for older adapters/fixtures that omit the field; an explicit
    // SANDBOX or STAGING provider is still excluded from customer discovery.
    return (await this.providersService.listProviders(undefined, 'LIVE')).filter(provider =>
      (!provider.environment || provider.environment === 'LIVE') && !isDemoOrSandboxProvider(provider));
  }
  private invalidate(state: ConversationState) {
    if (state.action?.status === 'SUBMITTING') throw new BadRequestException('Action is being reconciled; request its status before changing it.');
    state.revision++;
    delete state.quote;
    delete state.confirmation;
    delete state.action;
    delete state.payment;
  }
  private reset(state: ConversationState) {
    for (const key of Object.keys(state)) delete (state as any)[key];
    Object.assign(state, emptyConversationState());
  }
  private async turn(input: ChatRequest, state: ConversationState, save: () => Promise<void>): Promise<ChatResult> {
    const providers = await this.visibleProviders();
    // Retry uncertain dispatch with the exact persisted key/payload, never reinterpret it as a new action.
    if (state.action?.status === 'SUBMITTING') return this.submit(state, input.userId, save);
    let turn = await this.resolver.resolve(input.prompt, state, providers);
    const selection = input.selections?.[0];
    if (selection) {
      if (selection.groupId?.startsWith('order:') && selection.groupId !== `order:${state.quote?.id}`) throw new BadRequestException('Confirmation refers to a different quote.');
      if (selection.kind === 'provider') turn = { intent: 'SEARCH', providerSlug: selection.providerSlug, query: state.query || '' };
      else if (selection.kind === 'offering') turn = { intent: 'SELECT', providerSlug: selection.providerSlug, offeringId: selection.offeringId || selection.id, quantity: selection.quantity };
      else if (selection.kind === 'variant') turn = { intent: 'SELECT', variantId: selection.variantId || selection.id };
      else if (selection.kind === 'option' && selection.groupId) turn = { intent: 'PROVIDE_FIELD', fields: { [`selectedOptions.${selection.groupId}`]: selection.id } };
      else if (selection.fieldPath) turn = { intent: 'PROVIDE_FIELD', fields: { [selection.fieldPath]: selection.value } };
    }
    state.intent = turn.intent;
    if (turn.intent === 'CANCEL') {
      if (state.action?.actionId) {
        await this.actionsService.cancelAction({ actionId: state.action.actionId, environment: state.environment, reason: 'Customer requested cancellation' }, { id: input.userId });
      }
      this.reset(state);
      return { content: 'So‘rov bekor qilindi. Yangi so‘rov yozishingiz mumkin.' };
    }
    if (state.action?.actionId && ['STATUS', 'CONTINUE', 'ACCEPT'].includes(turn.intent)) {
      const { action } = await this.actionsService.getLiveAction({ actionId: state.action.actionId, environment: state.environment }, { id: input.userId });
      const provider = providers.find(p => p.slug === state.providerSlug);
      return { content: formatCustomerActionStatus(action, provider), interaction: this.primitives([{ type: 'ActionStatusCard', action }]) };
    }
    if (turn.intent === 'REJECT') {
      delete state.confirmation;
      return { content: 'Tasdiqlanmadi. Nimani o‘zgartiramiz?' };
    }
    if (turn.providerSlug && turn.providerSlug !== state.providerSlug) {
      const provider = providers.find(item => item.slug === turn.providerSlug);
      if (!provider) return this.providerChoices(providers);
      const query = turn.query || state.query;
      this.reset(state);
      state.providerSlug = provider.slug;
      state.manifest = manifestOf(provider);
      state.query = query;
    }
    let provider = providers.find(item => item.slug === state.providerSlug);
    if (!provider) {
      state.query = turn.query || input.prompt;
      return this.providerChoices(providers);
    }
    state.manifest = manifestOf(provider);
    if (state.action?.status === 'CREATED') {
      // Keep existing action addressable until a deliberate new search/selection.
      if (!['SEARCH', 'SELECT'].includes(turn.intent)) return { content: 'Yaratilgan so‘rovning holatini ko‘rish yoki uni bekor qilish mumkin.' };
      this.invalidate(state);
      delete state.selectedOffering;
    }
    this.applyTurn(state, turn);
    if (turn.intent === 'SEARCH' && state.selectedOffering) {
      this.invalidate(state);
      delete state.selectedOffering;
      delete state.selectedVariant;
      state.selectedOptions = [];
    }
    await save();
    if (turn.intent === 'SEARCH' || (!state.selectedOffering && !state.offerings.length && state.manifest?.requirements?.QUOTE?.inputMode !== 'PARAMETERS')) {
      state.query = turn.query ?? state.query ?? input.prompt;
      state.capability = provider.capabilities.includes(ProviderCapability.SEARCH) ? 'SEARCH' : 'CATALOG';
      const missing = conversationRequirements(state, state.capability);
      if (missing.length) return this.ask(state, missing);
      if (provider.capabilities.includes(ProviderCapability.SEARCH)) {
        state.offerings = await this.catalogService.searchOfferings(provider.slug, state.query || '', undefined, state.locationId, 30, state.parameters, state.environment);
      } else if (provider.capabilities.includes(ProviderCapability.CATALOG)) {
        const catalog = await this.catalogService.getCatalog(provider.slug, state.locationId, undefined, state.parameters, state.environment);
        state.offerings = catalog.offerings;
        state.parametersSchema = catalog.parametersSchema;
      } else if (state.manifest?.requirements?.QUOTE?.inputMode !== 'PARAMETERS') return { content: 'Bu hamkor katalog yoki qidiruv imkoniyatini e’lon qilmagan.' };
      state.offerings = state.offerings.filter(offering => offering.isAvailable !== false);
      if (!state.offerings.length && state.manifest?.requirements?.QUOTE?.inputMode !== 'PARAMETERS') return { content: 'Mos taklif topilmadi. So‘rovni aniqlashtiring.' };
      // Resolve the original selection against fresh canonical data, not guessed IDs.
      const grounded = await this.resolver.resolve(input.prompt, state, [provider]);
      if (grounded.offeringId || grounded.cheapest) this.applyTurn(state, grounded);
      if (!state.selectedOffering) return this.offeringChoices(state);
    }
    if (!state.selectedOffering && state.manifest?.requirements?.QUOTE?.inputMode !== 'PARAMETERS' && state.manifest?.requirements?.QUOTE?.inputMode !== 'EITHER') return this.offeringChoices(state);
    if (!provider.capabilities.includes(ProviderCapability.QUOTE) || !provider.capabilities.includes(ProviderCapability.ACTION_CREATE)) {
      return { content: state.selectedOffering ? [state.selectedOffering.title, state.selectedOffering.description].filter(Boolean).join('\n') : 'Hamkor faqat ma’lumot taqdim etadi.',
        interaction: state.selectedOffering ? this.primitives([{ type: 'OfferingCard', offering: state.selectedOffering }]) : undefined };
    }
    state.capability = 'QUOTE';
    const missingQuote = conversationRequirements(state, 'QUOTE');
    if (missingQuote.length) return this.ask(state, missingQuote);
    if (!state.quote || Date.parse(state.quote.expiresAt) <= Date.now()) {
      delete state.confirmation;
      await save();
      state.quote = await this.quotesService.requestQuote(this.actionInput(state) as any);
      await save();
      const missingAction = conversationRequirements(state, 'ACTION_CREATE');
      if (missingAction.length) return this.ask(state, missingAction, formatCustomerQuote(state.quote, provider));
      return this.confirmation(state, provider);
    }
    if (turn.intent === 'ACCEPT') state.confirmation = { quoteId: state.quote.id, revision: state.revision, accepted: true };
    const missingAction = conversationRequirements(state, 'ACTION_CREATE');
    if (missingAction.length) return this.ask(state, missingAction);
    state.missingFields = [];
    if (state.confirmation?.accepted && state.confirmation.quoteId === state.quote.id && state.confirmation.revision === state.revision) return this.submit(state, input.userId, save);
    return this.confirmation(state, provider);
  }

  private applyTurn(state: ConversationState, turn: SemanticTurn) {
    const before = JSON.stringify([state.selectedOffering?.id, state.selectedVariant, state.selectedOptions, state.quantity, state.parameters, state.locations, state.fulfillment, state.paymentMethod]);
    let offeringId = turn.offeringId;
    if (turn.cheapest || turn.alternatives) {
      const available = state.offerings.filter(item => item.isAvailable !== false && (!turn.alternatives || item.id !== state.selectedOffering?.id));
      if (turn.cheapest) available.sort((a, b) => a.basePrice - b.basePrice);
      offeringId = available[0]?.id;
    }
    if (offeringId && offeringId !== state.selectedOffering?.id) {
      const offering = state.offerings.find(item => item.id === offeringId && item.isAvailable !== false);
      if (!offering) throw new BadRequestException('Selection is not present in the current canonical offerings.');
      state.selectedOffering = offering;
      state.selectedVariant = undefined;
      state.selectedOptions = [];
      const variants = (offering.variants || []).filter(variant => variant.isAvailable !== false);
      if (variants.length === 1) state.selectedVariant = variants[0].id;
    }
    if (turn.variantId) {
      if (!state.selectedOffering?.variants?.some(variant => variant.id === turn.variantId && variant.isAvailable !== false)) throw new BadRequestException('Variant unavailable.');
      state.selectedVariant = turn.variantId;
    }
    if (turn.quantity !== undefined) {
      if (!Number.isInteger(turn.quantity) || turn.quantity < 1 || turn.quantity > 10000) throw new BadRequestException('Invalid quantity.');
      state.quantity = turn.quantity;
    }
    for (const [path, value] of Object.entries(turn.fields || {})) this.applyField(state, path, value);
    const after = JSON.stringify([state.selectedOffering?.id, state.selectedVariant, state.selectedOptions, state.quantity, state.parameters, state.locations, state.fulfillment, state.paymentMethod]);
    if (before !== after) this.invalidate(state);
  }
  private applyField(state: ConversationState, path: string, value: unknown) {
    if (path.startsWith('locations.')) {
      const role = path.slice(10);
      if (!state.manifest?.supportedLocationRoles?.some(item => item.role === role) || typeof value !== 'string' || !value.trim()) throw new BadRequestException('Invalid location role or address.');
      state.locations = state.locations.filter(item => item.role !== role);
      state.locations.push({ role, address: { raw: value.trim() } });
      return;
    }
    if (path.startsWith('selectedOptions.')) {
      const groupId = path.slice(16);
      const group = state.selectedOffering?.optionGroups?.find(item => item.id === groupId);
      if (!group?.options?.some(option => option.id === value && option.isAvailable !== false)) throw new BadRequestException('Option unavailable.');
      state.selectedOptions = state.selectedOptions.filter(option => option.groupId !== groupId || group.maxSelections > 1);
      if (!state.selectedOptions.some(option => option.groupId === groupId && option.optionId === value)) state.selectedOptions.push({ groupId, optionId: String(value), quantity: 1 });
      if (state.selectedOptions.filter(option => option.groupId === groupId).length > group.maxSelections) throw new BadRequestException('Too many selected options.');
      return;
    }
    let schema: any;
    if (path.startsWith('parameters.')) {
      const parts = path.slice(11).split('.');
      for (const source of [state.manifest?.parametersSchema, state.parametersSchema, state.selectedOffering?.parametersSchema,
        state.quote?.requirements?.parametersSchema,
        state.manifest?.fulfillmentRequirements?.[state.fulfillment || '']?.parametersSchema,
        ...Object.values(state.manifest?.requirements || {}).map(requirement => requirement.parametersSchema)]) {
        let property: any = source;
        for (const part of parts) property = property?.properties?.[part];
        if (property) schema = property;
      }
    } else if (path.startsWith('customer.') && ['name','phone','email'].includes(path.slice(9))) {
      schema = { type: 'string', minLength: path === 'customer.phone' ? 6 : 1, format: path === 'customer.email' ? 'email' : undefined };
    } else if (path === 'fulfillment') schema = { type: 'string', enum: state.manifest?.supportedFulfillmentModes };
    else if (path === 'paymentMethod') schema = { type: 'string', enum: state.manifest?.supportedPaymentMethods };
    else if (path === 'selectedVariant') {
      if (!state.selectedOffering?.variants?.some(variant => variant.id === value && variant.isAvailable !== false)) throw new BadRequestException('Variant unavailable.');
      state.selectedVariant = String(value); return;
    }
    if (!schema || !validateSlot({ path, title: path, type: schema.type, schema }, value)) throw new BadRequestException('Field value does not match the provider schema.');
    writeField(state, path, value);
    if (path.startsWith('customer.') && !CustomerContactSchema.partial().safeParse(state.customer).success) throw new BadRequestException('Invalid customer contact.');
  }
  private actionInput(state: ConversationState): any {
    return { providerSlug: state.providerSlug!, environment: state.environment, locationId: state.locationId,
      items: state.selectedOffering ? [{ offeringId: state.selectedOffering.id, variantId: state.selectedVariant, quantity: state.quantity, selectedOptions: state.selectedOptions }] : [],
      parameters: state.parameters, customer: state.customer, locations: state.locations, fulfillmentType: state.fulfillment, paymentMethod: state.paymentMethod };
  }
  private async submit(state: ConversationState, userId: string, save: () => Promise<void>): Promise<ChatResult> {
    if (!state.quote || !state.confirmation?.accepted || state.confirmation.quoteId !== state.quote.id) throw new BadRequestException('A reviewed quote and explicit confirmation are required.');
    state.action ??= { idempotencyKey: randomUUID(), quoteId: state.quote.id, status: 'SUBMITTING' };
    await save(); // Failure before dispatch is safe; after dispatch the same key survives restart.
    const action = await this.actionsService.createAction({ ...this.actionInput(state), quoteId: state.quote.id,
      idempotencyKey: state.action.idempotencyKey, userConfirmed: true }, userId);
    state.action = { ...state.action, status: 'CREATED', actionId: action.publicId || action.id };
    state.payment = { url: action.nextAction?.url || action.paymentUrl, status: action.paymentStatus };
    await save();
    const provider = await this.providersService.getProviderBySlug(state.providerSlug!, state.environment);
    return { content: formatCustomerActionConfirmation(action, provider), interaction: this.primitives([
      { type: 'ActionStatusCard', action }, ...(state.payment.url ? [{ type: 'PaymentCard', payment: state.payment }] : [])]) };
  }
  private primitives(components: any[]) { return { version: 1, kind: 'universal', components }; }
  private ask(state: ConversationState, missing: ConversationField[], prefix = ''): ChatResult {
    state.missingFields = missing;
    const field = missing[0];
    const variant = field.path === 'selectedVariant';
    const optionGroup = state.selectedOffering?.optionGroups?.find(group => field.path === `selectedOptions.${group.id}`);
    const choices = variant ? state.selectedOffering?.variants : optionGroup?.options;
    return { content: `${prefix ? prefix + '\n\n' : ''}${field.title} — ${field.enum ? 'variantni tanlang yoki yozing.' : 'kiriting.'}`,
      interaction: this.primitives([{ type: variant ? 'VariantSelector' : optionGroup ? 'OptionSelector' : field.type === 'location' ? 'LocationInput' : field.format === 'date' || field.format === 'date-time' ? 'DateInput' : 'FieldInput',
        field, choices: choices?.filter(choice => choice.isAvailable !== false), currency: state.selectedOffering?.currency, providerSlug: state.providerSlug }]) };
  }
  private confirmation(state: ConversationState, provider: any): ChatResult {
    state.missingFields = [];
    return { content: formatCustomerQuote(state.quote, provider), interaction: this.primitives([
      { type: 'QuoteSummary', quote: state.quote }, { type: 'ConfirmationCard', quoteId: state.quote!.id }]) };
  }
  private providerChoices(providers: any[]): ChatResult {
    return { content: providers.length ? 'Qaysi hamkorni tanlaymiz?' : 'Hozir mos faol hamkor topilmadi.',
      interaction: { version: 1, kind: 'provider_list', providers: providers.map(provider => ({ id: provider.slug, slug: provider.slug,
        name: provider.branding?.displayName || provider.name, logoUrl: provider.branding?.logoUrl || provider.logoUrl,
        ...provider.branding, cuisine: provider.description, prompt: provider.name })) } };
  }
  private offeringChoices(state: ConversationState): ChatResult {
    return { content: state.offerings.length ? 'Mos taklifni tanlang yoki qanday variant kerakligini yozing.' : 'So‘rovni aniqlashtiring.',
      interaction: this.primitives(state.offerings.slice(0, 20).map(offering => ({ type: 'OfferingCard', offering, providerSlug: state.providerSlug }))) };
  }
}

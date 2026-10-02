import { ActionStatus } from '@zayuno/contracts';

export interface IikoCredentials {
  appId?: string;
  clientSecret?: string;
  apiKey?: string;
  apiLogin?: string;
}

export interface AccessTokenV2Request {
  appId: string;
  clientSecret: string;
  apiKey: string;
}

export interface AccessTokenV1Request {
  apiLogin: string;
}

export interface AccessTokenResponse {
  correlationId?: string;
  token: string;
}

export interface IikoOrganization {
  id: string;
  name: string;
  code?: string;
  currencyIsoName?: string | null;
  currencyMinimumDenomination?: number | null;
  countryPhoneCode?: string | null;
  restaurantAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
}

export interface IikoTerminalGroup {
  id: string;
  organizationId: string;
  name: string;
  address?: string | null;
  timeZone?: string;
}

export interface TerminalGroupAliveInfo {
  isAlive: boolean;
  terminalGroupId: string;
  organizationId: string;
}

export interface IikoNomenclatureCategory {
  id: string;
  name: string;
  description?: string | null;
  isDeleted?: boolean;
}

export interface IikoSize {
  id: string;
  name: string;
  priority?: number;
}

export interface IikoPrice {
  currentPrice: number;
  isIncludedInMenu: boolean;
}

export interface IikoSizePrice {
  sizeId?: string | null;
  price: IikoPrice;
}

export interface IikoChildModifier {
  id: string;
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  freeOfChargeAmount?: number;
  hideIfDefaultAmount?: boolean;
}

export interface IikoGroupModifier {
  id: string;
  minAmount: number;
  maxAmount: number;
  required?: boolean;
  childModifiers: IikoChildModifier[];
}

export interface IikoSimpleModifier {
  id: string;
  defaultAmount?: number;
  minAmount?: number;
  maxAmount?: number;
  freeOfChargeAmount?: number;
  hideIfDefaultAmount?: boolean;
}

export interface IikoProduct {
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  groupId?: string | null;
  productCategoryId?: string | null;
  type?: string | null; // dish | good | modifier
  orderItemType?: string | null;
  sizePrices: IikoSizePrice[];
  modifiers?: IikoSimpleModifier[];
  groupModifiers?: IikoGroupModifier[];
  imageLinks?: string[];
  isDeleted?: boolean;
  order?: number;
  tags?: string[];
}

export interface IikoNomenclatureResponse {
  correlationId?: string;
  groups: IikoNomenclatureCategory[];
  productCategories?: any[];
  products: IikoProduct[];
  sizes?: IikoSize[];
  revision?: number;
}

export interface IikoStopListItem {
  productId: string;
  balance: number;
  sizeId?: string | null;
  sku?: string | null;
}

export interface IikoTerminalGroupStopList {
  terminalGroupId: string;
  items: IikoStopListItem[];
}

export interface IikoStopListsResponse {
  correlationId?: string;
  terminalGroupStopLists: Array<{
    organizationId: string;
    items: IikoTerminalGroupStopList[];
  }>;
}

export type IikoDeliveryStatus =
  | 'Unconfirmed'
  | 'WaitCooking'
  | 'ReadyForCooking'
  | 'CookingStarted'
  | 'CookingCompleted'
  | 'Waiting'
  | 'OnWay'
  | 'Delivered'
  | 'Closed'
  | 'Cancelled';

export type IikoOrderServiceType = 'DeliveryByCourier' | 'DeliveryByClient';

export interface IikoOrderItemModifier {
  productId: string;
  amount: number;
  productGroupId?: string;
  price?: number;
  positionId?: string;
}

export interface IikoOrderItem {
  type: 'Product' | 'Compound';
  productId: string;
  amount: number;
  price: number;
  productSizeId?: string;
  positionId?: string;
  comment?: string;
  modifiers?: IikoOrderItemModifier[];
}

export type IikoDeliveryAddress =
  | {
      type?: 'city';
      line1: string;
      flat?: string;
      entrance?: string;
      floor?: string;
      doorphone?: string;
      regionId?: string;
    }
  | {
      type?: 'legacy';
      street: {
        name: string;
        city?: string;
      };
      house: string;
      flat?: string;
      entrance?: string;
      floor?: string;
      doorphone?: string;
      regionId?: string;
    };

export interface IikoCreateOrderRequest {
  organizationId: string;
  terminalGroupId: string;
  createOrderSettings?: {
    transportToFrontTimeout?: number;
  };
  order: {
    id?: string;
    phone: string;
    orderServiceType: IikoOrderServiceType;
    deliveryPoint?: {
      coordinates?: {
        latitude: number;
        longitude: number;
      };
      address?: IikoDeliveryAddress;
      comment?: string;
    };
    customer?: {
      name?: string;
      surname?: string;
      comment?: string;
    };
    items: IikoOrderItem[];
    comment?: string;
  };
}

export interface IikoPaymentType {
  id: string;
  name: string;
  kind?: string;
}

export interface IikoPaymentItem {
  paymentType: IikoPaymentType;
  sum: number;
  isPreliminary?: boolean;
  isExternal?: boolean;
  isProcessedExternally?: boolean;
  isFiscalizedExternally?: boolean;
  isPrepay?: boolean;
}

export interface IikoOrderInfo {
  id: string;
  posId?: string | null;
  externalNumber?: string | null;
  organizationId: string;
  timestamp: number;
  creationStatus: 'InProgress' | 'Success' | 'Error';
  errorInfo?: {
    code?: string;
    message?: string;
    description?: string;
  };
  order?: {
    id?: string;
    status?: IikoDeliveryStatus;
    sum?: number;
    processedPaymentsSum?: number | null;
    payments?: IikoPaymentItem[];
    number?: number;
    phone?: string;
    customer?: {
      id?: string;
      name?: string;
    };
    cancelInfo?: {
      whenCancelled?: string;
      cause?: { id: string; name: string };
      comment?: string;
    };
    [key: string]: any;
  };
}

export interface IikoCreateDeliveryResponse {
  correlationId?: string;
  orderInfo: IikoOrderInfo;
}

export interface IikoOrdersResponse {
  correlationId?: string;
  orders: IikoOrderInfo[];
}

export interface IikoCancelOrderRequest {
  organizationId: string;
  orderId: string;
  cancelComment?: string;
  cancelCauseId?: string;
}

export interface IikoCancelOrderResponse {
  correlationId?: string;
}

export interface IikoCommandStatusRequest {
  organizationId: string;
  correlationId: string;
}

export interface IikoCommandStatusResponse {
  state: 'InProgress' | 'Success' | 'Error';
  exception?: any;
  errorReason?: string | null;
}

/**
 * Maps an iiko DeliveryStatus to Zayuno canonical ActionStatus.
 */
export function mapIikoDeliveryStatusToActionStatus(
  status?: IikoDeliveryStatus,
  creationStatus?: 'InProgress' | 'Success' | 'Error'
): ActionStatus {
  if (creationStatus === 'Error') {
    return ActionStatus.FAILED;
  }
  if (!status) {
    return creationStatus === 'InProgress' ? ActionStatus.PROCESSING : ActionStatus.CREATED;
  }

  switch (status) {
    case 'Unconfirmed':
      return ActionStatus.CONFIRMED;
    case 'WaitCooking':
    case 'ReadyForCooking':
    case 'CookingStarted':
    case 'CookingCompleted':
    case 'Waiting':
    case 'OnWay':
      return ActionStatus.PROCESSING;
    case 'Delivered':
    case 'Closed':
      return ActionStatus.COMPLETED;
    case 'Cancelled':
      return ActionStatus.CANCELLED;
    default:
      return ActionStatus.PROCESSING;
  }
}

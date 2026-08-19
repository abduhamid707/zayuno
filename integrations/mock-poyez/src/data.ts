import type { CatalogCategory, Location, Offering, OfferingVariant } from '@zayuno/contracts';

export type SeatLevel = 'LOWER' | 'UPPER' | 'SINGLE';
export type CarClass = 'SEATED' | 'GENERAL' | 'PLATSKART' | 'KUPE' | 'SV';

export interface RailCarTemplate {
  id: string;
  number: string;
  class: CarClass;
  title: string;
  price: number;
  seatCount: number;
}

export interface RailTripTemplate {
  id: string;
  trainNumber: string;
  serviceLabel: 'TEZYURAR' | 'SHARQ' | 'YOLOVCHI';
  originId: string;
  destinationId: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  runsOnDays: number[];
  cars: RailCarTemplate[];
}

export const POYEZ_STATIONS: Location[] = [
  ['toshkent-markaziy', 'Toshkent Markaziy', 'Toshkent shahri, Mirobod tumani', 41.294, 69.287],
  ['toshkent-janubiy', 'Toshkent Janubiy', 'Toshkent shahri, Chilonzor tumani', 41.257, 69.222],
  ['guliston', 'Guliston', 'Sirdaryo viloyati, Guliston shahri', 40.489, 68.784],
  ['samarqand', 'Samarqand', 'Samarqand shahri', 39.654, 66.959],
  ['buxoro-1', 'Buxoro 1', 'Buxoro shahri', 39.774, 64.428],
  ['qarshi', 'Qarshi', 'Qashqadaryo viloyati, Qarshi shahri', 38.861, 65.789]
].map(([id, name, address, latitude, longitude]) => ({
  id: String(id), providerId: 'poyez-sandbox', providerLocationId: String(id), name: String(name), address: String(address),
  coordinates: { latitude: Number(latitude), longitude: Number(longitude) },
  operatingHours: { open: '00:00', close: '23:59', days: [1,2,3,4,5,6,7] }, serviceRadiusKm: 0, isActive: true,
  metadata: { kind: 'RAILWAY_STATION', sandbox: true }
}));

const car = (id: string, number: string, carClass: CarClass, title: string, price: number, seatCount: number): RailCarTemplate =>
  ({ id, number, class: carClass, title, price, seatCount });

export const POYEZ_TRIPS: RailTripTemplate[] = [
  {
    id: 'ps-tg-1600', trainNumber: 'ZY-054', serviceLabel: 'TEZYURAR', originId: 'toshkent-janubiy', destinationId: 'guliston',
    departureTime: '16:00', arrivalTime: '17:12', durationMinutes: 72, runsOnDays: [1,2,3,4,5,6,7],
    cars: [car('tg16-p-10','10','PLATSKART','Platskart',118000,36), car('tg16-k-03','03','KUPE','Kupe',148000,36), car('tg16-sv-01','01','SV','SV',238000,18)]
  },
  {
    id: 'ps-tg-2030', trainNumber: 'ZY-712', serviceLabel: 'SHARQ', originId: 'toshkent-janubiy', destinationId: 'guliston',
    departureTime: '20:30', arrivalTime: '21:36', durationMinutes: 66, runsOnDays: [1,2,3,4,5,6,7],
    cars: [car('tg20-o-08','08','SEATED','O‘rindiqli',136000,54), car('tg20-k-05','05','KUPE','Kupe',152000,36)]
  },
  {
    id: 'ps-ts-0730', trainNumber: 'ZY-101', serviceLabel: 'TEZYURAR', originId: 'toshkent-markaziy', destinationId: 'samarqand',
    departureTime: '07:30', arrivalTime: '09:45', durationMinutes: 135, runsOnDays: [1,2,3,4,5,6,7],
    cars: [car('ts07-o-04','04','SEATED','Ekonom o‘rindiqli',182000,54), car('ts07-b-02','02','SV','Biznes',318000,18)]
  },
  {
    id: 'ps-tb-2145', trainNumber: 'ZY-202', serviceLabel: 'YOLOVCHI', originId: 'toshkent-janubiy', destinationId: 'buxoro-1',
    departureTime: '21:45', arrivalTime: '06:30', durationMinutes: 525, runsOnDays: [1,2,3,4,5,6,7],
    cars: [car('tb21-p-12','12','PLATSKART','Platskart',198000,36), car('tb21-k-06','06','KUPE','Kupe',274000,36), car('tb21-sv-02','02','SV','SV',448000,18)]
  }
];

export const POYEZ_CATEGORIES: CatalogCategory[] = [
  { id: 'rail-high-speed', slug: 'high-speed', title: 'Tezyurar test reyslari', displayOrder: 1 },
  { id: 'rail-passenger', slug: 'passenger', title: 'Yo‘lovchi test reyslari', displayOrder: 2 }
];

export function stationName(id: string): string {
  return POYEZ_STATIONS.find(value => value.id === id)?.name || id;
}

export function normalizeDate(value?: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00+05:00`);
    if (!Number.isNaN(parsed.valueOf())) return value;
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);
}

export function seatLevel(number: number, carClass: CarClass): SeatLevel {
  if (carClass === 'SEATED' || carClass === 'GENERAL') return 'SINGLE';
  return number % 2 === 0 ? 'UPPER' : 'LOWER';
}

export function tripOffering(trip: RailTripTemplate, date: string, remainingByCar?: Record<string, number>): Offering {
  const variants: OfferingVariant[] = trip.cars.map(value => ({
    id: value.id, name: `${value.title} — ${value.number}-vagon`, sku: value.id, basePrice: value.price,
    isAvailable: (remainingByCar?.[value.id] ?? value.seatCount) > 0,
    metadata: { carId: value.id, carNumber: value.number, carClass: value.class, remainingSeats: remainingByCar?.[value.id] ?? value.seatCount }
  }));
  const minPrice = Math.min(...trip.cars.map(value => value.price));
  return {
    id: `${trip.id}__${date}`, providerId: 'poyez-sandbox', offeringCode: `${trip.trainNumber}-${date}`,
    title: `${stationName(trip.originId)} → ${stationName(trip.destinationId)} · ${trip.departureTime}`,
    description: `${trip.serviceLabel} sandbox reysi ${trip.trainNumber}. ${trip.departureTime}–${trip.arrivalTime}, ${trip.durationMinutes} daqiqa.`,
    categorySlug: trip.serviceLabel === 'TEZYURAR' ? 'high-speed' : 'passenger',
    categoryTitle: trip.serviceLabel === 'TEZYURAR' ? 'Tezyurar test reyslari' : 'Yo‘lovchi test reyslari',
    basePrice: minPrice, currency: 'UZS', isAvailable: variants.some(value => value.isAvailable), variants,
    optionGroups: [
      { id: 'insurance', name: 'Baxtsiz hodisalardan sandbox sug‘urta', minSelections: 0, maxSelections: 1, isRequired: false,
        options: [{ id: 'accident-insurance', name: 'Sug‘urta', description: 'Sandbox qo‘shimcha xizmat', priceDelta: 10000, isDefault: false, isAvailable: true, metadata: { perPassenger: true } }] },
      { id: 'green-ticket', name: 'Yashil chipta', minSelections: 0, maxSelections: 1, isRequired: false,
        options: [{ id: 'green-support', name: 'Ekologiyani qo‘llab-quvvatlash', priceDelta: 0, isDefault: false, isAvailable: true, metadata: {} }] }
    ],
    tags: ['standard','poyezd','rail','ticket',trip.serviceLabel.toLowerCase(),stationName(trip.originId).toLowerCase(),stationName(trip.destinationId).toLowerCase()],
    metadata: { sandbox: true, date, tripId: trip.id, trainNumber: trip.trainNumber, serviceLabel: trip.serviceLabel, originId: trip.originId,
      origin: stationName(trip.originId), destinationId: trip.destinationId, destination: stationName(trip.destinationId), departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime, durationMinutes: trip.durationMinutes, timezone: 'Asia/Tashkent' }
  };
}

export function resolveTripOffering(offeringId: string): { trip: RailTripTemplate; date: string } | undefined {
  const separator = offeringId.lastIndexOf('__');
  const tripId = separator >= 0 ? offeringId.slice(0, separator) : offeringId;
  const rawDate = separator >= 0 ? offeringId.slice(separator + 2) : undefined;
  const date = normalizeDate(rawDate);
  if (rawDate && date !== rawDate) return undefined;
  const trip = POYEZ_TRIPS.find(value => value.id === tripId || `${value.trainNumber}-${date}` === offeringId);
  return trip ? { trip, date } : undefined;
}

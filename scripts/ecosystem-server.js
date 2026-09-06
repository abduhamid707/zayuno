// ==============================================================================
// Zayuno 25 Ecosystem Provider Server (Pure Node.js - Zero External Dependencies)
// High-performance HTTP server serving all 25 providers with rich parametersSchema
// ==============================================================================

const http = require('http');
const url = require('url');

const PROVIDERS_25 = [
  {
    "slug": "uzrailways",
    "name": "Uzrailways Express — Poyezd Chiptalari",
    "type": "TICKETING",
    "category": "transport_tickets",
    "description": "O‘zbekiston temir yo‘llari bo‘ylab Afrosiyob, Sharq va tezyurar poyezdlarga rasmiy chiptalar buyurtma qilish xizmati.",
    "rating": 4.9,
    "phone": "+998712999999",
    "hours": "24/7",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "uzr-loc-toshkent-shimoliy",
        "name": "Toshkent Shimoliy vokzali (Markaziy)",
        "address": "Toshkent sh., Mirobod tumani, Turkiston ko‘chasi, 7-uy",
        "lat": 41.294,
        "lng": 69.287,
        "radius": 25
      },
      {
        "id": "uzr-loc-toshkent-janubiy",
        "name": "Toshkent Janubiy vokzali",
        "address": "Toshkent sh., Yakkasaroy tumani, Usmon Nosir ko‘chasi, 110-uy",
        "lat": 41.257,
        "lng": 69.222,
        "radius": 25
      },
      {
        "id": "uzr-loc-samarqand",
        "name": "Samarqand temir yo‘l vokzali",
        "address": "Samarqand sh., Beruniy ko‘chasi, 1-uy",
        "lat": 39.654,
        "lng": 66.959,
        "radius": 30
      },
      {
        "id": "uzr-loc-buxoro",
        "name": "Buxoro 1 temir yo‘l vokzali",
        "address": "Buxoro viloyati, Kogon shahri",
        "lat": 39.774,
        "lng": 64.428,
        "radius": 30
      }
    ],
    "offerings": [
      {
        "id": "rail-01",
        "title": "Afrosiyob: Toshkent → Samarqand (07:30)",
        "category": "high_speed",
        "price": 175000,
        "description": "Tezyurar Afrosiyob elektropoyezdi. Yo‘l vaqti: 2 soat 10 daqiqa.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-02",
        "title": "Afrosiyob: Toshkent → Samarqand (08:30)",
        "category": "high_speed",
        "price": 175000,
        "description": "Ertalabki qulay qatnov, choy va yengil tamaddi taqdim etiladi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-03",
        "title": "Afrosiyob: Toshkent → Buxoro (07:30)",
        "category": "high_speed",
        "price": 235000,
        "description": "Toshkent - Samarqand - Buxoro tezyurar yo‘nalishi. 3 soat 50 daqiqa.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-04",
        "title": "Afrosiyob: Toshkent → Qarshi (08:00)",
        "category": "high_speed",
        "price": 210000,
        "description": "Qashqadaryoga qulay tezyurar yo‘nalish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-05",
        "title": "Afrosiyob: Samarqand → Toshkent (17:30)",
        "category": "high_speed",
        "price": 175000,
        "description": "Kechki qaytish reysi, Wi-Fi va qulay o‘rindiqlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-06",
        "title": "Afrosiyob: Buxoro → Toshkent (15:50)",
        "category": "high_speed",
        "price": 235000,
        "description": "Buxorodan poytaxtga tezyurar qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-07",
        "title": "Sharq poyezdi: Toshkent → Buxoro (09:15)",
        "category": "fast_train",
        "price": 145000,
        "description": "Kupe va platskart vagonli tezyurar qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-08",
        "title": "Sharq poyezdi: Toshkent → Termiz (19:30)",
        "category": "night_train",
        "price": 195000,
        "description": "Kechki tungi qatnov, qulay yotish o‘rindiqlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-09",
        "title": "Nasaf poyezdi: Toshkent → Qarshi (13:00)",
        "category": "fast_train",
        "price": 130000,
        "description": "Konditsionerli o‘rindiqli vagonlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-10",
        "title": "Tezyurar: Toshkent → Andijon (08:05)",
        "category": "valley_train",
        "price": 125000,
        "description": "Qamchiq dovoni orqali Farg‘ona vodiysiga go‘zal manzara bilan sayohat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-11",
        "title": "Tezyurar: Toshkent → Namangan (14:30)",
        "category": "valley_train",
        "price": 120000,
        "description": "Pop va Qo‘qon orqali qatnaydigan tezyurar qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-12",
        "title": "Yo‘lovchi poyezdi: Toshkent → Xiva (21:00)",
        "category": "khiva_express",
        "price": 280000,
        "description": "Tarixiy Xiva shahriga to‘g‘ridan-to‘g‘ri qatnov, qulay kupe.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-13",
        "title": "Yo‘lovchi poyezdi: Toshkent → Nukus (18:15)",
        "category": "long_distance",
        "price": 295000,
        "description": "Qoraqalpog‘iston poytaxtiga to‘g‘ridan-to‘g‘ri reys.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-14",
        "title": "Sharq: Samarqand → Buxoro (10:45)",
        "category": "intercity",
        "price": 85000,
        "description": "Tarixiy shaharlar oralig‘idagi qulay qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-15",
        "title": "Afrosiyob: Biznes klass qo‘shimcha xizmati",
        "category": "vip_service",
        "price": 95000,
        "description": "Keng charm o‘rindiqlar, issiq taom va shaxsiy multimedia.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-16",
        "title": "Afrosiyob: VIP vagon xizmati",
        "category": "vip_service",
        "price": 160000,
        "description": "Maxsus yopiq kupe, mini-bar va to‘liq maxfiylik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-17",
        "title": "Toshkent vokzali VIP zal xizmati",
        "category": "station_service",
        "price": 75000,
        "description": "Navbatsiz ro‘yxatdan o‘tish, qulay kutish zali, bepul kofe va tamaddi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-18",
        "title": "Poyezdda bolalar uchun alohida chipta",
        "category": "family",
        "price": 85000,
        "description": "5 yoshdan 10 yoshgacha bo‘lgan bolalar uchun 50% chegirmali o‘rin.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-19",
        "title": "Qo‘shimcha yuk chiptasi (36 kg gacha)",
        "category": "baggage",
        "price": 35000,
        "description": "Me’yordan ortiqcha yuklarni vagon bagaj bo‘limiga rasmiylashtirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-20",
        "title": "Poyezdda uy hayvonlarini tashish xizmati",
        "category": "pet_travel",
        "price": 45000,
        "description": "Veterinariya guvohnomasi bilan kichik uy jonivorlarini olib yurish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      },
      {
        "id": "rail-21",
        "title": "Poyezd ichida issiq milliy taom buyurtmasi",
        "category": "onboard_meal",
        "price": 42000,
        "description": "Yo‘lda issiq palov yoki somsa yetkazib berish xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "passenger_name",
            "doc_series",
            "travel_class"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Jo‘nash sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi to‘liq ismi (F.I.O)"
            },
            "doc_series": {
              "type": "string",
              "title": "Pasport yoki ID karta seriyasi va raqami (masalan: AA1234567)"
            },
            "travel_class": {
              "type": "string",
              "enum": [
                "Ekonom",
                "Biznes",
                "VIP"
              ],
              "title": "Vagon toifasi"
            },
            "seat_preference": {
              "type": "string",
              "enum": [
                "Deraza yonida",
                "Yo‘lak yonida",
                "Pastki o‘rin",
                "Farqi yo‘q"
              ],
              "title": "Joy tanlovi"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "uzbekistan-airways",
    "name": "Uzbekistan Airways — Aviachiptalar va Samolyot",
    "type": "TICKETING",
    "category": "transport_tickets",
    "description": "O‘zbekiston Milliy aviakompaniyasi bo‘ylab ichki va xalqaro aviareyslarga onlayn chipta xarid qilish.",
    "rating": 4.8,
    "phone": "+998781400200",
    "hours": "24/7",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "air-loc-tas-inter",
        "name": "Islom Karimov nomidagi Toshkent Xalqaro Aeroporti",
        "address": "Toshkent sh., Sergeli tumani, Qumariq ko‘chasi, 13-uy",
        "lat": 41.257,
        "lng": 69.281,
        "radius": 40
      },
      {
        "id": "air-loc-office",
        "name": "Aviakassa Markaziy Savdo Ofisi",
        "address": "Toshkent sh., Mirobod tumani, Amir Temur shoh ko‘chasi, 41-uy",
        "lat": 41.312,
        "lng": 69.278,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "air-01",
        "title": "Aviareys: Toshkent → Samarqand (HY-041)",
        "category": "domestic",
        "price": 215000,
        "description": "Parvoz vaqti: 45 daqiqa. Airbus A320 samolyoti.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-02",
        "title": "Aviareys: Toshkent → Buxoro (HY-023)",
        "category": "domestic",
        "price": 245000,
        "description": "Parvoz vaqti: 1 soat. Tez va qulay qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-03",
        "title": "Aviareys: Toshkent → Urganch / Xiva (HY-051)",
        "category": "domestic",
        "price": 385000,
        "description": "Har kuni 2 mahal muntazam reys. 1 soat 20 daqiqa.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-04",
        "title": "Aviareys: Toshkent → Nukus (HY-011)",
        "category": "domestic",
        "price": 420000,
        "description": "Qoraqalpog‘istonga to‘g‘ridan-to‘g‘ri qulay havo yo‘li.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-05",
        "title": "Aviareys: Toshkent → Termiz (HY-065)",
        "category": "domestic",
        "price": 340000,
        "description": "Surxondaryoga tezkor aviaqatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-06",
        "title": "Aviareys: Toshkent → Farg‘ona (HY-081)",
        "category": "domestic",
        "price": 195000,
        "description": "Vodiy bo‘ylab 40 daqiqalik qisqa parvoz.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-07",
        "title": "Aviareys: Toshkent → Namangan (HY-095)",
        "category": "domestic",
        "price": 195000,
        "description": "Toshkentdan Namanganga qulay havo yo‘li.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-08",
        "title": "Aviareys: Toshkent → Dubay (DXB) (HY-333)",
        "category": "international",
        "price": 2100000,
        "description": "Har kungi to‘g‘ridan-to‘g‘ri reys. Parvoz: 3 soat 40 daqiqa.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-09",
        "title": "Aviareys: Toshkent → Istanbul (IST) (HY-271)",
        "category": "international",
        "price": 2450000,
        "description": "Boing 787 Dreamliner samolyotida xalqaro reys.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-10",
        "title": "Aviareys: Toshkent → Olmaota (ALA) (HY-761)",
        "category": "international",
        "price": 980000,
        "description": "Qo‘shni Qozog‘istonga 1 soat 10 daqiqalik qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-11",
        "title": "Aviareys: Samarqand → Sankt-Peterburg (HY-639)",
        "category": "international",
        "price": 1950000,
        "description": "Samarqand xalqaro aeroportidan to‘g‘ridan-to‘g‘ri parvoz.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-12",
        "title": "Aviareys: Toshkent → Seul (ICN) (HY-511)",
        "category": "international",
        "price": 4900000,
        "description": "Janubiy Koreyaga to‘g‘ridan-to‘g‘ri Dreamliner reysi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-13",
        "title": "Aviareys: Toshkent → London (LHR) (HY-201)",
        "category": "international",
        "price": 5400000,
        "description": "Buyuk Britaniyaga haftada 3 marta qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-14",
        "title": "Aviareys: Qo‘shimcha bagaj 23 kg rasmiylashtirish",
        "category": "ancillary",
        "price": 180000,
        "description": "Cheklangan me’yordan tashqari qo‘shimcha chamadon joyi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-15",
        "title": "Aeroportda CIP zal xizmati (Toshkent CIP)",
        "category": "vip_lounge",
        "price": 350000,
        "description": "Tezkor bojxona, alohida zal, shved stoli va bepul Wi-Fi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-16",
        "title": "Biznes-klassga o‘tish (Upgrade to Business)",
        "category": "upgrade",
        "price": 850000,
        "description": "Keng yotuvchi kreslo, premium menyu va ustuvor chiqish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-17",
        "title": "Samolyotda maxsus ovqatlanish (Halol / Diabetik)",
        "category": "meal_selection",
        "price": 45000,
        "description": "Parvozdan 24 soat oldin maxsus menyu tanlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-18",
        "title": "Samolyotda birinchi qatordan joy tanlash (Front Seat)",
        "category": "seat_selection",
        "price": 90000,
        "description": "Oyoqlar uchun keng joy bo‘lgan old qatorlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-19",
        "title": "Parvoz sug‘urtasi (Medical & Travel Insurance)",
        "category": "insurance",
        "price": 65000,
        "description": "Parvoz kechikishi va tibbiy holatlardan xalqaro sug‘urta.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      },
      {
        "id": "air-20",
        "title": "Hamrohliksiz uchuvchi bola xizmati (UMNR)",
        "category": "special_assistance",
        "price": 250000,
        "description": "5 yoshdan 16 yoshgacha bo‘lgan bolani styuardessa kuzatib borishi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "flight_date",
            "passenger_full_name",
            "doc_number",
            "citizenship"
          ],
          "properties": {
            "flight_date": {
              "type": "string",
              "title": "Parvoz sanasi (YYYY-MM-DD)"
            },
            "passenger_full_name": {
              "type": "string",
              "title": "Yo‘lovchi xorijiy pasportidagi ism-familiyasi (Lotincha)"
            },
            "doc_number": {
              "type": "string",
              "title": "Pasport yoki ID raqami (masalan: FA1234567)"
            },
            "citizenship": {
              "type": "string",
              "title": "Fuqaroligi (masalan: UZB)"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sanasi (YYYY-MM-DD)"
            },
            "extra_baggage": {
              "type": "boolean",
              "title": "Qo‘shimcha 23kg yuk kerakmi?"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "fastbus",
    "name": "FastBus Express — Shaharlararo Avtobus Chiptalari",
    "type": "TICKETING",
    "category": "transport_tickets",
    "description": "Zamonaviy, konditsionerli va Wi-Fi mavjud avtobuslarda shaharlararo qatnovlar chiptalari.",
    "rating": 4.7,
    "phone": "+998712077000",
    "hours": "06:00 - 23:00",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "bus-loc-toshkent",
        "name": "Toshkent Avtovokzali (Olmazor)",
        "address": "Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi, Olmazor metro",
        "lat": 41.258,
        "lng": 69.198,
        "radius": 20
      },
      {
        "id": "bus-loc-samarqand",
        "name": "Samarqand Avtovokzali",
        "address": "Samarqand sh., Dahbed ko‘chasi",
        "lat": 39.682,
        "lng": 66.971,
        "radius": 25
      }
    ],
    "offerings": [
      {
        "id": "bus-01",
        "title": "Avtobus: Toshkent → Samarqand (08:00)",
        "category": "intercity",
        "price": 65000,
        "description": "Yutong komfort avtobus, konditsioner, USB zaryadlagich.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-02",
        "title": "Avtobus: Toshkent → Buxoro (09:00)",
        "category": "intercity",
        "price": 95000,
        "description": "Keng o‘rindiqlar, yo‘lda 2 ta to‘xtash joyi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-03",
        "title": "Avtobus: Toshkent → Farg‘ona (07:30)",
        "category": "valley",
        "price": 70000,
        "description": "Qamchiq dovoni orqali xavfsiz qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-04",
        "title": "Avtobus: Toshkent → Andijon (08:30)",
        "category": "valley",
        "price": 75000,
        "description": "Kunlik qulay avtobus qatnovi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-05",
        "title": "Avtobus: Toshkent → Namangan (09:30)",
        "category": "valley",
        "price": 70000,
        "description": "Namangan markaziga to‘g‘ridan-to‘g‘ri qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-06",
        "title": "Avtobus: Toshkent → Qarshi (10:00)",
        "category": "intercity",
        "price": 85000,
        "description": "Qashqadaryo viloyatiga qulay ekspress.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-07",
        "title": "Avtobus: Toshkent → Termiz (17:00)",
        "category": "intercity",
        "price": 120000,
        "description": "Kechki tungi qatnov, uxlash uchun mos o‘rindiqlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-08",
        "title": "Avtobus: Toshkent → Zomin tog‘lari (Dam olish reysi)",
        "category": "tourism_bus",
        "price": 60000,
        "description": "Shanba va yakshanba kunlari Zomin sanatoriysiga reys.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-09",
        "title": "Avtobus: Toshkent → Chimyon / Chorvoq",
        "category": "tourism_bus",
        "price": 45000,
        "description": "Chorvoq suv ombori va dam olish zonalariga qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-10",
        "title": "Avtobus: Toshkent → Jizzax",
        "category": "intercity",
        "price": 50000,
        "description": "Har 2 soatda qatnaydigan qulay mikroavtobus.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-11",
        "title": "Avtobus: Toshkent → Guliston",
        "category": "intercity",
        "price": 35000,
        "description": "Sirdaryo viloyatiga tezkor yo‘nalish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-12",
        "title": "Avtobus: Toshkent → Navoiy",
        "category": "intercity",
        "price": 90000,
        "description": "Navoiy shahar markaziga boruvchi ekspress.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-13",
        "title": "Avtobus: Toshkent → Urganch / Xiva",
        "category": "intercity",
        "price": 160000,
        "description": "Xorazmga uzoq masofali xavfsiz qatnov.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-14",
        "title": "Avtobus: Toshkent → Nukus",
        "category": "intercity",
        "price": 175000,
        "description": "Katta sig‘imli qulay avtobus.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-15",
        "title": "VIP mikroavtobus: Toshkent → Samarqand (Mercedes Sprinter)",
        "category": "vip_transfer",
        "price": 110000,
        "description": "18 kishilik charm salonli tezkor mikroavtobus.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-16",
        "title": "VIP mikroavtobus: Toshkent → Qo‘qon",
        "category": "vip_transfer",
        "price": 95000,
        "description": "Dovon orqali tezkor va qulay elit mikroavtobus.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-17",
        "title": "Avtobusda old qatorni band qilish xizmati",
        "category": "seat_service",
        "price": 15000,
        "description": "Haydovchi orqasidagi qulay joylar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-18",
        "title": "Qo‘shimcha katta yuk haqi",
        "category": "baggage",
        "price": 20000,
        "description": "Katta o‘lchamli qutilar va sumkalar uchun.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-19",
        "title": "Guruhlar uchun avtobusni to‘liq ijaraga olish (50 o‘rin)",
        "category": "charter",
        "price": 2800000,
        "description": "To‘y, tadbir va korporativ sayohatlar uchun sutkalik ijara.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      },
      {
        "id": "bus-20",
        "title": "Ekskursiya gid bilan avtobus xizmati",
        "category": "guided_tour",
        "price": 450000,
        "description": "Toshkent shahri bo‘ylab 4 soatlik shahar sayohati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "trip_date",
            "passenger_name",
            "passenger_phone"
          ],
          "properties": {
            "trip_date": {
              "type": "string",
              "title": "Safar sanasi (YYYY-MM-DD)"
            },
            "passenger_name": {
              "type": "string",
              "title": "Yo‘lovchi ismi"
            },
            "passenger_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "passengers_count": {
              "type": "number",
              "title": "Yo‘lovchilar soni",
              "default": 1
            }
          }
        }
      }
    ]
  },
  {
    "slug": "city-cargo",
    "name": "CityCargo — Yuk Tashish va Shaharlararo Logistika",
    "type": "SERVICES",
    "category": "logistics_cargo",
    "description": "Shahar ichida va viloyatlararo tezkor yuk tashish, mebel ko‘chirish va yukchilar xizmati.",
    "rating": 4.8,
    "phone": "+998712050505",
    "hours": "08:00 - 22:00",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "cargo-loc-chilonzor",
        "name": "CityCargo G‘arbiy Depo",
        "address": "Toshkent sh., Uchtepa tumani, TXAY yoqasida",
        "lat": 41.282,
        "lng": 69.175,
        "radius": 30
      },
      {
        "id": "cargo-loc-sergeli",
        "name": "CityCargo Janubiy Logistika Parki",
        "address": "Toshkent sh., Yangihayot tumani, Yangi Sergeli ko‘chasi",
        "lat": 41.218,
        "lng": 69.215,
        "radius": 30
      }
    ],
    "offerings": [
      {
        "id": "cargo-01",
        "title": "Damas Labo yuk mashinasi (1 tonnagacha)",
        "category": "light_truck",
        "price": 90000,
        "description": "Shahar ichida kichik yuklar, maishiy texnika tashish. Dastlabki soat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-02",
        "title": "Gazel tentli yuk mashinasi (2.5 tonna, 4 metr)",
        "category": "medium_truck",
        "price": 140000,
        "description": "Kvartira ko‘chirish, mebellar va qurilish mollari uchun ideal.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-03",
        "title": "Gazel izotermik / budka (muzlatkichli)",
        "category": "refrigerated",
        "price": 170000,
        "description": "Oziq-ovqat va harorat talab qiluvchi mahsulotlar tashish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-04",
        "title": "Isuzu yuk mashinasi (5 tonna, 6 metr)",
        "category": "heavy_truck",
        "price": 240000,
        "description": "Katta hajmdagi tijoriy yuklar va ombor ko‘chirish xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-05",
        "title": "MAN fura yuk tashish (20 tonna viloyatlararo)",
        "category": "heavy_truck",
        "price": 1800000,
        "description": "Viloyatlar bo‘ylab yirik partiyadagi yuklarni yetkazish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-06",
        "title": "Malakali yuk ortuvchi mutaxassis (1 kishi/soat)",
        "category": "loaders",
        "price": 45000,
        "description": "Mebel, og‘ir qutilarni ehtiyotkorlik bilan ko‘tarish va tushirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-07",
        "title": "2 kishilik yukchilar brigadasi (2 soatlik paket)",
        "category": "loaders",
        "price": 160000,
        "description": "Kvartira va ofis ko‘chirishda to‘liq yuklash-tushirish xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-08",
        "title": "Mebellarni qismlarga ajratish va qayta yig‘ish",
        "category": "furniture_assembly",
        "price": 95000,
        "description": "Shkaf, kravat va oshxona mebellariga professional ustalar xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-09",
        "title": "Pufakchali plyonka va qutilar bilan qadoqlash",
        "category": "packing",
        "price": 55000,
        "description": "Mo‘rt buyumlar, idish-tovoq va televizorlarni xavfsiz o‘rash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-10",
        "title": "Pianino va og‘ir seyflarni ko‘chirish",
        "category": "heavy_item",
        "price": 180000,
        "description": "Maxsus tasmalar bilan 150 kg dan ortiq yuklarni ko‘tarish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-11",
        "title": "Shoshilinch ekspress yuk yetkazish (30 daqiqada)",
        "category": "express",
        "price": 120000,
        "description": "Buyurtma berilgan zahoti Labo yetib boradi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-12",
        "title": "Toshkent → Samarqand yo‘nalishida yuk yetkazish",
        "category": "intercity_cargo",
        "price": 550000,
        "description": "Labo yoki Gazelda manzilgacha eshikdan eshikkacha yetkazish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-13",
        "title": "Toshkent → Farg‘ona vodiysi yuk yetkazish",
        "category": "intercity_cargo",
        "price": 650000,
        "description": "Dovon orqali xavfsiz yuk tashish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-14",
        "title": "Toshkent → Buxoro yuk tashish",
        "category": "intercity_cargo",
        "price": 850000,
        "description": "Ishonchli haydovchilar bilan tovar yetkazish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-15",
        "title": "Evakuator xizmati (Yengil avtomobil)",
        "category": "towing",
        "price": 150000,
        "description": "Buzilgan yoki avariyaga uchragan mashinani servisga olib borish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-16",
        "title": "Evakuator xizmati (Jip va mikroavtobus)",
        "category": "towing",
        "price": 200000,
        "description": "Og‘ir vaznli avtomobillarni xavfsiz ortish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-17",
        "title": "Qurilish chiqindilarini olib ketish va tashlash",
        "category": "waste_removal",
        "price": 220000,
        "description": "Qopdagi g‘isht, suvoq va ta’mir chiqindilarini utilizatsiya qilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-18",
        "title": "Do‘kondan xarid qilingan texnikani yetkazish",
        "category": "store_delivery",
        "price": 80000,
        "description": "Muzlatkich yoki kir yuvish mashinasini qavatga olib chiqish bilan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-19",
        "title": "Kutilmagan kechki yuk tashish (22:00 dan keyin)",
        "category": "night_shift",
        "price": 180000,
        "description": "Tungi vaqtda tirbandliksiz qulay ko‘chish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      },
      {
        "id": "cargo-20",
        "title": "Kompaniyalar uchun oylik shartnomaviy logistika",
        "category": "b2b_cargo",
        "price": 2500000,
        "description": "Korxona va internet-do‘konlar uchun kunlik taqsimot.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pickup_address",
            "destination_address",
            "cargo_type",
            "need_loaders"
          ],
          "properties": {
            "pickup_address": {
              "type": "string",
              "title": "Yuk olinadigan manzil"
            },
            "destination_address": {
              "type": "string",
              "title": "Yuk yetkaziladigan manzil"
            },
            "cargo_type": {
              "type": "string",
              "title": "Yuk tavsifi (masalan: Mebel, maishiy texnika, qutilar)"
            },
            "need_loaders": {
              "type": "boolean",
              "title": "Yukchilar xizmati kerakmi?",
              "default": false
            },
            "floor_number": {
              "type": "number",
              "title": "Nechanchi qavatga ko‘tarish kerak?",
              "default": 1
            }
          }
        }
      }
    ]
  },
  {
    "slug": "nova-clinic",
    "name": "Nova Eye — Ko‘z Klinikasi va Mikroxirurgiya",
    "type": "BOOKINGS",
    "category": "medical_healthcare",
    "description": "Ilg‘or Germaniya texnologiyalariga asoslangan zamonaviy oftalmologiya va ko‘z mikroxirurgiyasi klinikasi.",
    "rating": 4.9,
    "phone": "+998712001122",
    "hours": "08:30 - 18:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "nova-loc-markaz",
        "name": "Nova Clinic Markaziy binosi",
        "address": "Toshkent sh., Shayxontohur tumani, Labzak ko‘chasi, 24-uy",
        "lat": 41.331,
        "lng": 69.262,
        "radius": 20
      },
      {
        "id": "nova-loc-chilonzor",
        "name": "Nova Eye Chilonzor filiali",
        "address": "Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi, 18-uy",
        "lat": 41.285,
        "lng": 69.212,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "nova-01",
        "title": "To‘liq kompyuterlashtirilgan ko‘z diagnostikasi",
        "category": "diagnostics",
        "price": 150000,
        "description": "Ko‘z tubi, ko‘rish o‘tkirligi, ko‘z bosimi va shoxparda topografiyasi tekshiruvi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-02",
        "title": "Oliy toifali oftalmolog shifokor ko‘rigi va konsultatsiyasi",
        "category": "consultation",
        "price": 120000,
        "description": "Tajribali mutaxassis ko‘rigi, tashxis qo‘yish va davolash rejasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-03",
        "title": "Femto-LASIK lazerli ko‘rish korreksiyasi (ikkala ko‘z)",
        "category": "surgery",
        "price": 5500000,
        "description": "Yaqindan va uzoqdan ko‘rolmaslikni (miopiya, gipermetropiya) og‘riqsiz davolash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-04",
        "title": "SmartPulse PRK lazer korreksiyasi",
        "category": "surgery",
        "price": 4200000,
        "description": "Yupqa shoxpardalar uchun xavfsiz kontakt-siz lazer amaliyoti.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-05",
        "title": "Katarakta fakoemulsifikatsiyasi (AQSh sun’iy linzasi bilan)",
        "category": "surgery",
        "price": 4800000,
        "description": "Ultratovush yordamida kataraktani olib tashlash va yumshoq linza o‘rnatish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-06",
        "title": "Katarakta jarrohligi (Premium Multifokal linza bilan)",
        "category": "surgery",
        "price": 8200000,
        "description": "Ham uzoqni, ham yaqinni ko‘zoynaksiz tiniq ko‘rish imkoniyati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-07",
        "title": "Glaukomani lazer yordamida davolash (Selektiv trabekuloplastika)",
        "category": "glaucoma",
        "price": 1200000,
        "description": "Ko‘z ichi bosimini normallashtirish va ko‘rish nervini saqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-08",
        "title": "To‘r pardani lazerli koagulyatsiyasi (diabetik retinopatiya)",
        "category": "retina",
        "price": 950000,
        "description": "To‘r pardaning ko‘chishi va qon quyilishining oldini olish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-09",
        "title": "Keratokonus krosslinking muolajasi (1 ko‘z)",
        "category": "cornea",
        "price": 2100000,
        "description": "Shoxpardani mustahkamlash va deformatsiyani to‘xtatish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-10",
        "title": "Bolalar oftalmologi ko‘rigi va apparatli davolash kursi",
        "category": "pediatric",
        "price": 140000,
        "description": "G‘ilaylik, ambliopiya va ko‘z toliqishini zamonaviy apparatlarda davolash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-11",
        "title": "Ko‘rish apparatida 10 kunlik davolash kursi (Synoptophore)",
        "category": "therapy",
        "price": 650000,
        "description": "Ko‘z mushaklarini kuchaytirish va binokulyar ko‘rishni tiklash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-12",
        "title": "Tungi ortokeratologik linzalar tanlash (Paragon)",
        "category": "lenses",
        "price": 2800000,
        "description": "Kechasi taqib uxlansa, kunduzi ko‘zoynaksiz 100% tiniq ko‘rish ta’minlanadi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-13",
        "title": "Optik koherent tomografiya (OKT / OCT to‘r parda)",
        "category": "diagnostics",
        "price": 180000,
        "description": "Ko‘z to‘qimalarining mikron darajadagi qatlamli rentgen-siz skaneri.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-14",
        "title": "Pachimetriya (shoxparda qalinligini o‘lchash)",
        "category": "diagnostics",
        "price": 60000,
        "description": "Lazer korreksiyasidan oldingi majburiy aniq tekshiruv.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-15",
        "title": "Ko‘zoynak va kontakt linzalar uchun professional retsept",
        "category": "optometry",
        "price": 50000,
        "description": "Avtorefraktometr va foropter yordamida aniq dioptriya belgilash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-16",
        "title": "Ko‘zga dori vositalarini paraorbital yuborish (ukol)",
        "category": "treatment",
        "price": 35000,
        "description": "Tajribali hamshiralar tomonidan steril sharoitda bajariladi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-17",
        "title": "Quruq ko‘z sindromini IPL yorug‘lik terapiyasi bilan davolash",
        "category": "dry_eye",
        "price": 320000,
        "description": "Kompyuterda ko‘p ishlovchilar uchun ko‘z qizarishi va qumlanishini yo‘qotish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-18",
        "title": "Pterigiumni plastik usulda olib tashlash",
        "category": "surgery",
        "price": 1400000,
        "description": "Ko‘z oqiga o‘sib kirgan pardani asoratsiz bartaraf etish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-19",
        "title": "Bemorga uy sharoitida oftalmolog ko‘rigi tashkillashtirish",
        "category": "home_visit",
        "price": 350000,
        "description": "Keksa va harakati cheklangan insonlar uchun ko‘chma apparatli ko‘rik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      },
      {
        "id": "nova-20",
        "title": "Shoshilinch ko‘z jarohati va yot jismni olish",
        "category": "emergency",
        "price": 110000,
        "description": "Ko‘zga metall, chang yoki jism tushganda darhol mikroskop ostida tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "birth_year",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemorning to‘liq ismi (F.I.O)"
            },
            "birth_year": {
              "type": "number",
              "title": "Tug‘ilgan yili (masalan: 1995)"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabulga kelish sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "09:00 - 11:00",
                "11:00 - 13:00",
                "14:00 - 16:00",
                "16:00 - 18:00"
              ],
              "title": "Qulay vaqt oralig‘i"
            },
            "symptoms": {
              "type": "string",
              "title": "Asosiy shikoyatingiz (masalan: Ko‘rish xiralashgan, ko‘z qizarishi)"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "dental-one",
    "name": "Dental One — Stomatologiya va Tish Davolash",
    "type": "BOOKINGS",
    "category": "medical_healthcare",
    "description": "Og‘riqsiz davolash, Shveytsariya implantatsiyasi va estetik Gollivud tabassumini yaratish markazi.",
    "rating": 4.9,
    "phone": "+998712003344",
    "hours": "09:00 - 20:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "dent-loc-oybek",
        "name": "Dental One Oybek klinikasi",
        "address": "Toshkent sh., Mirobod tumani, Oybek ko‘chasi, 38-uy",
        "lat": 41.298,
        "lng": 69.271,
        "radius": 20
      },
      {
        "id": "dent-loc-yunusobod",
        "name": "Dental One Yunusobod filiali",
        "address": "Toshkent sh., Yunusobod tumani, Megaplanet yaqinida",
        "lat": 41.362,
        "lng": 69.288,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "dent-01",
        "title": "Birlamchi stomatolog ko‘rigi va 3D rentgen (KT) konsultatsiyasi",
        "category": "consultation",
        "price": 70000,
        "description": "Og‘iz bo‘shlig‘ini to‘liq ko‘rikdan o‘tkazish va individual davolash rejasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-02",
        "title": "Professional tish tozalash (AirFlow + Ultratovush)",
        "category": "hygiene",
        "price": 280000,
        "description": "Tish toshlari, sariq dog‘larni tozalash va emalni ftorlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-03",
        "title": "Lazerli tish oqartirish (Zoom 4 texnologiyasi)",
        "category": "aesthetic",
        "price": 1200000,
        "description": "Emalga zarar yetkazmasdan tishlarni 6-8 tongacha oqartirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-04",
        "title": "Germaniya nurlanuvchi kompozit plomba (Filtek)",
        "category": "therapy",
        "price": 220000,
        "description": "Tish rangi bilan 100% bir xil tushuvchi mustahkam estetik plomba.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-05",
        "title": "Kariesni chuqur davolash va tish restavratsiyasi",
        "category": "therapy",
        "price": 310000,
        "description": "Tishning anatomik shaklini qatlamma-qatlam qayta tiklash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-06",
        "title": "Tish ildiz kanallarini mikroskop ostida davolash (1 kanal)",
        "category": "endodontics",
        "price": 160000,
        "description": "Kanalni steril tozalash va issiq gutta-percha bilan germetik to‘ldirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-07",
        "title": "Shveytsariya Straumann titan implanti o‘rnatish",
        "category": "implantology",
        "price": 4200000,
        "description": "Dunyo bo‘yicha 99.8% o‘zlashish kafolatiga ega premium implant.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-08",
        "title": "Janubiy Koreya Osstem implanti o‘rnatish",
        "category": "implantology",
        "price": 2600000,
        "description": "Hamyonbop va yuqori mustahkamlikdagi titan implant.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-09",
        "title": "Sirkoniy oksidi asosidagi tish toj qoplamasi (Zirconia Crown)",
        "category": "prosthetics",
        "price": 950000,
        "description": "Metall-siz, tabiiy tishdek nur o‘tkazuvchi o‘ta mustahkam qoplama.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-10",
        "title": "E-Max keramika vinir (Gollivud tabassumi, 1 tish)",
        "category": "aesthetic",
        "price": 1400000,
        "description": "Tishning old qismiga yopishtiriluvchi ingichka tabiiy keramika qoplamasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-11",
        "title": "Metall breket tizimi (ikkala jag‘ uchun to‘liq kurs)",
        "category": "orthodontics",
        "price": 4500000,
        "description": "Tish qatoridagi egriliklarni to‘g‘rilash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-12",
        "title": "Ko‘rinmas keramik / sapfir breketlar",
        "category": "orthodontics",
        "price": 6800000,
        "description": "Estetik va tishda deyarli sezilmaydigan breketlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-13",
        "title": "Ko‘rinmas kapalar (Elaynerlar) bilan tish to‘g‘rilash",
        "category": "orthodontics",
        "price": 12000000,
        "description": "Breketsiz, yechib olinuvchi shaffof kapalar tizimi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-14",
        "title": "Donolik tishini (8-tish) og‘riqsiz murakkab sug‘urish",
        "category": "surgery",
        "price": 350000,
        "description": "Suyak ichida yotgan yoki qiyshiq chiqqan tishni xavfsiz olib tashlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-15",
        "title": "Oddiy tishni og‘riqsiz sug‘urish (anesteziya bilan)",
        "category": "surgery",
        "price": 120000,
        "description": "Fransiya artikain anesteziyasi bilan mutlaqo og‘riqsiz.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-16",
        "title": "Bolalar tishini davolash va rangli plomba o‘rnatish",
        "category": "pediatric",
        "price": 130000,
        "description": "Bolani qo‘rqitmasdan, o‘yin tarzida muloyim davolash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-17",
        "title": "Milk qonashini va parodontitni plazmolifting bilan davolash",
        "category": "periodontics",
        "price": 210000,
        "description": "Bemorning o‘z plazmasi orqali milk to‘qimasini tiklash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-18",
        "title": "Sinus-lifting (yuqori jag‘da suyak hajmini oshirish amaliyoti)",
        "category": "surgery",
        "price": 2800000,
        "description": "Implant o‘rnatishdan oldin suyak yetishmovchiligini bartaraf etish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-19",
        "title": "Bruksizmga (tish g‘ijirlatishga) qarshi tungi himoya kapasi",
        "category": "gnathology",
        "price": 400000,
        "description": "Tish emalini yemirilishdan saqlovchi individual kapa.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      },
      {
        "id": "dent-20",
        "title": "Shoshilinch o‘tkir tish og‘rig‘ini qoldirish muolajasi",
        "category": "emergency",
        "price": 150000,
        "description": "Navbatsiz qabul, nervni og‘riqsizlantirish va dori qo‘yish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "problem_type"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Ism va familiya"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qulay sana (YYYY-MM-DD)"
            },
            "problem_type": {
              "type": "string",
              "enum": [
                "O‘tkir tish og‘rig‘i",
                "Plomba qo‘yish",
                "Tish tozalash",
                "Implantatsiya",
                "Breket",
                "Boshqa"
              ],
              "title": "Muolaja turi"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "medline",
    "name": "Medline — Diagnostika Markazi va Tibbiy Tahlillar",
    "type": "BOOKINGS",
    "category": "medical_healthcare",
    "description": "Yuqori aniqlikdagi MRT (1.5 Tesla), MSKT, UZI va 500 dan ortiq avtomatlashtirilgan laborator tahlillar.",
    "rating": 4.8,
    "phone": "+998712008800",
    "hours": "24/7",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "med-loc-chust",
        "name": "Medline Bosh Laboratoriyasi",
        "address": "Toshkent sh., Mirzo Ulug‘bek tumani, Parkent ko‘chasi, 51-uy",
        "lat": 41.318,
        "lng": 69.324,
        "radius": 25
      },
      {
        "id": "med-loc-qoratosh",
        "name": "Medline Qoratosh Diagnostika Filiali",
        "address": "Toshkent sh., Shayxontohur tumani, Qoratosh ko‘chasi",
        "lat": 41.312,
        "lng": 69.231,
        "radius": 25
      }
    ],
    "offerings": [
      {
        "id": "med-01",
        "title": "Bosh miya MRT tekshiruvi (Siemens 1.5 Tesla)",
        "category": "mri",
        "price": 320000,
        "description": "Tomirlar, to‘qimalar va o‘smalarni yuqori aniqlikda aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-02",
        "title": "Umurtqa pog‘onasi MRT tekshiruvi (Bel-dumg‘aza sohasi)",
        "category": "mri",
        "price": 320000,
        "description": "Disk churralari (grija) va nerv qisilishi holatlarini baholash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-03",
        "title": "Tizza bo‘g‘imi MRT tekshiruvi",
        "category": "mri",
        "price": 320000,
        "description": "Menisk yorilishi, boylamlar jarohati va artrit diagnostikasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-04",
        "title": "Bosh miya va bo‘yin tomirlari MRT angiografiyasi",
        "category": "mri",
        "price": 420000,
        "description": "Qon aylanishi, anevrizma va tromblarni kontrast-siz tekshirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-05",
        "title": "O‘pka va ko‘krak qafasi MSKT tekshiruvi (Ko‘p qatlamli KT)",
        "category": "ct_scan",
        "price": 280000,
        "description": "Pnevmoniya, bronxit va o‘pka to‘qimasini batafsil tahlili.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-06",
        "title": "Qorin bo‘shlig‘i a’zolari MSKT tekshiruvi",
        "category": "ct_scan",
        "price": 350000,
        "description": "Jigar, oshqozon osti bezi, buyraklar va taloq tekshiruvi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-07",
        "title": "Qorin bo‘shlig‘i a’zolari kompleks UZI tekshiruvi",
        "category": "ultrasound",
        "price": 110000,
        "description": "Jigar, o‘t qopi, taloq, buyraklar holatini ultratovushda ko‘rish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-08",
        "title": "Yurak UZI tekshiruvi (Ekoxokardiografiya - ExoKG)",
        "category": "cardio",
        "price": 140000,
        "description": "Yurak klapanlari ishi, qon quyilishi va fraksiyasini baholash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-09",
        "title": "Qalqonsimon bez UZI tekshiruvi (Zob)",
        "category": "ultrasound",
        "price": 80000,
        "description": "Bez o‘lchami, tugunlar va kistalar mavjudligini aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-10",
        "title": "Bo‘yin va oyoq tomirlari dopplerografiyasi (UZDG)",
        "category": "ultrasound",
        "price": 130000,
        "description": "Varikoz, qon tomir torayishi va qon oqimi tezligi tahlili.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-11",
        "title": "Umumiy qon tahlili (UQT / CBC 24 parametr + SOE)",
        "category": "lab_tests",
        "price": 45000,
        "description": "Gemoglobin, leykotsitlar, trombotsitlar darajasi (1 soatda tayyor).",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-12",
        "title": "Biokimyoviy qon tahlili (Jigar va buyrak sinamalari: ALT, AST, Bilirubin, Kreatinin)",
        "category": "lab_tests",
        "price": 120000,
        "description": "Ichki a’zolar faoliyatining asosiy biokimyoviy ko‘rsatkichlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-13",
        "title": "Qonda qand miqdori (Glyukoza tahlili)",
        "category": "lab_tests",
        "price": 25000,
        "description": "Qandli diabetni erta aniqlash uchun och qoringa olinadigan tahlil.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-14",
        "title": "Glikatsiyalangan gemoglobin (HbA1c)",
        "category": "lab_tests",
        "price": 75000,
        "description": "Oxirgi 3 oylik qon qandining o‘rtacha darajasi monitoringi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-15",
        "title": "Qalqonsimon bez gormonlari paketi (TSH, Free T3, Free T4)",
        "category": "hormones",
        "price": 160000,
        "description": "Gormonal disbalans va zob kasalliklarini aniq tashxislash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-16",
        "title": "Vitamin D (25-OH Vitamin D) qondagi miqdori",
        "category": "vitamins",
        "price": 140000,
        "description": "Immunitet va suyak mustahkamligi uchun asosiy vitamin darajasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-17",
        "title": "Ferritin va qondagi zaxira temir tahlili",
        "category": "lab_tests",
        "price": 70000,
        "description": "Yashirin anemiya va holsizlik sababini aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-18",
        "title": "Koagulogramma (qon ivish tizimi tahlili: INR, Protrombin, Fibrinogen)",
        "category": "lab_tests",
        "price": 95000,
        "description": "Operatsiyalardan oldin va qon suyultiruvchi dorilar nazorati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-19",
        "title": "Uydan turib tahlillar uchun qon topshirish xizmati (Ko‘chma laboratoriya)",
        "category": "home_service",
        "price": 60000,
        "description": "Hamshira belgilangan vaqtda uyga kelib, steril probirkalarda qon oladi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      },
      {
        "id": "med-20",
        "title": "Check-Up erkaklar / ayollar salomatligi to‘liq profilaktik paketi",
        "category": "checkup",
        "price": 850000,
        "description": "MRT, UZI, 15 ta tahlil va terapevt yakuniy xulosasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "patient_phone",
            "appointment_date"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi va familiyasi"
            },
            "patient_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "appointment_date": {
              "type": "string",
              "title": "Kelish sanasi (YYYY-MM-DD)"
            },
            "home_visit": {
              "type": "boolean",
              "title": "Uyga hamshira chaqirish kerakmi?",
              "default": false
            }
          }
        }
      }
    ]
  },
  {
    "slug": "cardio-life",
    "name": "Cardio Life — Kardiologiya va Yurak Markazi",
    "type": "BOOKINGS",
    "category": "medical_healthcare",
    "description": "Yurak-qon tomir kasalliklarini erta aniqlash, aritmiya va gipertoniyani davolashga ixtisoslashgan kardiologiya markazi.",
    "rating": 4.9,
    "phone": "+998712004455",
    "hours": "08:00 - 18:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "cardio-loc-navoiy",
        "name": "Cardio Life Markaziy Binosi",
        "address": "Toshkent sh., Shayxontohur tumani, Alisher Navoiy ko‘chasi, 12-uy",
        "lat": 41.321,
        "lng": 69.245,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "card-01",
        "title": "Kardiologiya professori / fanlar nomzodi konsultatsiyasi",
        "category": "consultation",
        "price": 150000,
        "description": "Bemor shikoyatlarini tahlil qilish, EKG ko‘rigi va davolash tayinlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-02",
        "title": "Elektrokardiografiya (EKG) tahlili va shifokor xulosasi",
        "category": "diagnostics",
        "price": 60000,
        "description": "12 tarmoqli EKG orqali yurak ritmi va miokard holatini tekshirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-03",
        "title": "Xolter EKG monitoringi (24 soatlik uzluksiz yozuv)",
        "category": "diagnostics",
        "price": 250000,
        "description": "Yurak ritmi buzilishi va yashirin ishemiyani kunlik rejimda aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-04",
        "title": "SAD (Sutkalik arterial qon bosimi monitoringi - ABPM)",
        "category": "diagnostics",
        "price": 200000,
        "description": "Kun va tun davomida qon bosimi o‘zgarishlarini avtomat qayd qilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-05",
        "title": "Tredmil-test (Yurak stress-testi yugurish yo‘lakchasida)",
        "category": "stress_test",
        "price": 220000,
        "description": "Jismoniy yuklama vaqtida yurak qon bilan ta’minlanishini tekshirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-06",
        "title": "Exokardiografiya rangli doppler bilan (EhoKG / UZI yurak)",
        "category": "diagnostics",
        "price": 160000,
        "description": "Yurak mushaklari, kameralari va klapanlari faoliyatini 3D tasvirlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-07",
        "title": "Bo‘yin magistral tomirlari dupleks skaneri (BCA)",
        "category": "vascular",
        "price": 130000,
        "description": "Miyani qon bilan ta’minlovchi uyqu tomirlarida ateroskleroz tekshiruvi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-08",
        "title": "Oyoq venalari va arteriyalari dopplerografiyasi",
        "category": "vascular",
        "price": 140000,
        "description": "Varikoz, tromboz va oyoqlardagi qon aylanish buzilishlarini aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-09",
        "title": "Kardiologik qon tahlillari paketi (Lipidogramma: Xolesterin, LPVP, LPNP, Trigitseridlar)",
        "category": "lab",
        "price": 110000,
        "description": "Tomirlarda blyashka paydo bo‘lish xavfini baholash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-10",
        "title": "Kardiomarkerlar tahlili (Troponin I, D-Dimer)",
        "category": "emergency_lab",
        "price": 180000,
        "description": "Miokard infarkti va tromboemboliya xavfini tezkor aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-11",
        "title": "Aritmiyani medikamentoz davolash kursi",
        "category": "therapy",
        "price": 350000,
        "description": "Yurak urishi notekisligi (ekstrasistoliya, miltillovchi aritmiya) terapiyasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-12",
        "title": "Gipertoniyani (yuqori qon bosimi) bosqichma-bosqich tushirish rejasi",
        "category": "therapy",
        "price": 280000,
        "description": "Shaxsiy dori dozalarini tanlash va krizislarni oldini olish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-13",
        "title": "Infarktdan keyingi reabilitatsiya va hayot sifatini tiklash kursi",
        "category": "rehab",
        "price": 1200000,
        "description": "Kardiolog, parhezshunos va davolovchi jismoniy tarbiya nazorati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-14",
        "title": "Kardiologik kunduzgi statsionar (tomchilatuvchi ukol va muolajalar 1 kun)",
        "category": "day_hospital",
        "price": 180000,
        "description": "Tomirlarni mustahkamlovchi va qon aylanishini yaxshilovchi dorilar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-15",
        "title": "Elektr kardioversiya oldi maslahati va tekshiruvi",
        "category": "consultation",
        "price": 160000,
        "description": "Og‘ir aritmiyalarni xavfsiz bartaraf etishga tayyorgarlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-16",
        "title": "Uyga kardiolog shifokor va portativ EKG chaqirish",
        "category": "home_visit",
        "price": 300000,
        "description": "Xonadonga kardiolog tashrifi, darhol EKG tushirish va xulosa berish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-17",
        "title": "Kardiostimulyator (EKS) tekshiruvi va dasturlash",
        "category": "pacemaker",
        "price": 220000,
        "description": "Yurakka o‘rnatilgan sun’iy stimulyator batareyasi va ritmini sozlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-18",
        "title": "Sportchilar uchun yurak chidamliligi va ruxsatnoma tekshiruvi",
        "category": "sports_cardio",
        "price": 190000,
        "description": "Musobaqalar va og‘ir sport mashg‘ulotlari oldidan yurak testi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-19",
        "title": "Yurak yetishmovchiligi bo‘yicha individual parhez va ichish rejimi",
        "category": "diet",
        "price": 90000,
        "description": "Tuz va suyuqlik balansini to‘g‘ri taqsimlash ko‘rsatmalari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      },
      {
        "id": "card-20",
        "title": "Shoshilinch yurak tekshiruvi (Tezkor EKG + Kardiolog + Qon bosimi)",
        "category": "emergency",
        "price": 130000,
        "description": "Ko‘krak qafasida og‘riq, havo yetishmasligi paydo bo‘lganda navbatsiz qabul.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "phone",
            "preferred_date",
            "symptoms"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Bemor ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon"
            },
            "preferred_date": {
              "type": "string",
              "title": "Kelish kuni (YYYY-MM-DD)"
            },
            "symptoms": {
              "type": "string",
              "title": "Shikoyat (masalan: Yurak sanchishi, bosim oshishi)"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "silk-road-tours",
    "name": "Silk Road Tours — Tarixiy Sayohat va Turizm",
    "type": "SERVICES",
    "category": "travel_tourism",
    "description": "O‘zbekistonning qadimiy Samarqand, Buxoro va Xiva shaharlariga professional gidlar bilan unutilmas madaniy turlar.",
    "rating": 4.9,
    "phone": "+998712330055",
    "hours": "09:00 - 20:00",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "tour-loc-markaz",
        "name": "Silk Road Tours Bosh Ofisi",
        "address": "Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko‘chasi, 15-uy",
        "lat": 41.295,
        "lng": 69.261,
        "radius": 25
      }
    ],
    "offerings": [
      {
        "id": "srt-01",
        "title": "Samarqand ertagi: 1 kunlik Afrosiyob tezyurar turi",
        "category": "day_tour",
        "price": 580000,
        "description": "Afrosiyob poyezdi chiptalari, Registon, Go‘ri Amir, Bibixonim, shaxsiy gid va milliy tushlik kiritilgan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-02",
        "title": "Samarqand va Konigil qog‘oz fabrikasi: 2 kunlik tur",
        "category": "multiday",
        "price": 1150000,
        "description": "4 yulduzli mehmonxona, nonushta, shahar ekskursiyasi va qadimiy ipak qog‘oz tayyorlash master-klassi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-03",
        "title": "Qadimiy Buxoroi Sharif: 2 kunlik klassik madaniy tur",
        "category": "multiday",
        "price": 1350000,
        "description": "Ark qal’asi, Minorai Kalon, Labi Hovuz, Sitorai Mohi Xosa saroyi, transport va gid xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-04",
        "title": "Afsonaviy Xiva: Ichan Qal’a bo‘ylab 3 kunlik to‘liq sayohat",
        "category": "multiday",
        "price": 2100000,
        "description": "Aviachipta yoki poyezd, sharqona milliy mehmonxona, 50 dan ortiq tarixiy obidalar ko‘rigi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-05",
        "title": "Buyuk Ipak Yo‘li Oltin Halqasi (Toshkent-Samarqand-Buxoro 4 kun)",
        "category": "all_inclusive",
        "price": 2900000,
        "description": "VIP transport, eng sara restoranlar, barcha kirish chiptalari va professional gid hamrohligi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-06",
        "title": "Orol dengizi va Mo‘ynoq kemalar qabristoni jip safari (2 kun)",
        "category": "extreme_tour",
        "price": 1950000,
        "description": "Toyota Land Cruiser jipida Ustyurt platosi, Orol bo‘yidagi o‘tovlar (yurta) lagerida tunash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-07",
        "title": "Farg‘ona vodiysi hunarmandlari turi (Rishton kulolchiligi + Marg‘ilon atlasi)",
        "category": "craft_tour",
        "price": 780000,
        "description": "Rishton sopol ustalari uyi, Yodgorlik ipak fabrikasida gilam va atlas to‘qish jarayoni.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-08",
        "title": "Shahrisabz — Sohibqiron Amir Temur vatani (1 kunlik Samarqanddan tur)",
        "category": "day_tour",
        "price": 420000,
        "description": "Taxtaqoracha dovoni manzaralari, Oqsaroy qoldiqlari va Dorut-Tilovat majmuasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-09",
        "title": "Zomin milliy bog‘i va sharsharalari eko-turi (1 kun)",
        "category": "nature_tour",
        "price": 280000,
        "description": "Toza tog‘ havosi, archazorlar, Zomin osma ko‘prigi va qozon kabob tamaddisi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-10",
        "title": "Chorvoq, Chimyon va Amirsoy tog‘lariga 1 kunlik VIP transfer va sayohat",
        "category": "nature_tour",
        "price": 350000,
        "description": "Kanatka arqon yo‘li, tog‘ manzaralari va Chorvoq sohilida dam olish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-11",
        "title": "Toshkent shahrining 2200 yillik tarixi: 4 soatlik shahar ekskursiyasi",
        "category": "city_tour",
        "price": 180000,
        "description": "Hazrati Imom (Hazrati Usmon Mus’hafi), Chorsu bozori, Mustaqillik maydoni va metro bekatlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-12",
        "title": "Toshkent gastronomik turi: Haqiqiy o‘zbek oshxonalari bo‘ylab",
        "category": "gastro_tour",
        "price": 240000,
        "description": "Beshqozon oshi, tandir somsa, milliy shirinliklar degustatsiyasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-13",
        "title": "Ingliz, rus yoki frantsuz tilida so‘zlashuvchi individual professional gid",
        "category": "guide_service",
        "price": 400000,
        "description": "Kun bo‘yi xorijiy mehmonlarga qiziqarli tarixiy ma’lumotlar berish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-14",
        "title": "Samarqandda Registon maydonida kechki yorug‘lik 3D shousi chiptasi",
        "category": "events",
        "price": 65000,
        "description": "Tungi Registonning maftunkor yorug‘lik va musiqa dasturi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-15",
        "title": "Qadimiy Buxoro hammomida (XVI asr) an’anaviy sharqona uqalash",
        "category": "experience",
        "price": 220000,
        "description": "Bozori Kord qadimiy hammomida choy, giyohlar va sharqona massaj.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-16",
        "title": "Aydarko‘l sohilida tuya minish va o‘tovda tunash sayohati",
        "category": "nomad_tour",
        "price": 850000,
        "description": "Cho‘l tabiati, o‘tov lageri, gulxan atrofida oqinlar qo‘shig‘i.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-17",
        "title": "Samarqand sharob zavodi (Xovrenko) muzeyi va degustatsiyasi",
        "category": "tasting",
        "price": 120000,
        "description": "150 yillik vino yerto‘lalari bo‘ylab sayr va sara navlar tatib ko‘rish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-18",
        "title": "Tog‘da otda sayr qilish (Burchmulla / Chimyon 2 soat)",
        "category": "activity",
        "price": 180000,
        "description": "Tajribali yo‘riqchi hamrohligida xavfsiz ot minish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-19",
        "title": "Toshkent xalqaro aeroportidan VIP kutib olish va transfer",
        "category": "transfer",
        "price": 150000,
        "description": "Toyota Prado yoki Hyundai Staria avtomobilida mehmonxonagacha eltish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      },
      {
        "id": "srt-20",
        "title": "Korporativ guruhlar uchun Samarqandda jamoaviy timbilding turi",
        "category": "corporate",
        "price": 8500000,
        "description": "20 kishilik guruh uchun maxsus kvestlar, master-klasslar va tantanali kechki ovqat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "tour_date",
            "travelers_count",
            "contact_name",
            "contact_phone"
          ],
          "properties": {
            "tour_date": {
              "type": "string",
              "title": "Sayohat boshlanish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Sayohatchilar soni (kishi)",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqam"
            },
            "preferred_language": {
              "type": "string",
              "enum": [
                "O‘zbekcha",
                "Ruscha",
                "Inglizcha"
              ],
              "title": "Gid tili"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "dubaigo",
    "name": "DubaiGo Travel — BAA va Xorijiy Sayohatlar",
    "type": "SERVICES",
    "category": "travel_tourism",
    "description": "Dubay, Sharm-el-Sheyx, Antaliya va Umra ziyoratiga to‘g‘ridan-to‘g‘ri orombaxsh sayohat paketlari.",
    "rating": 4.8,
    "phone": "+998712009911",
    "hours": "09:00 - 20:00",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "dub-loc-amir",
        "name": "DubaiGo Markaziy Ofisi",
        "address": "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 88-uy",
        "lat": 41.339,
        "lng": 69.284,
        "radius": 25
      }
    ],
    "offerings": [
      {
        "id": "dub-01",
        "title": "Dubay ekonom sayohat paketi (5 kecha / 6 kun)",
        "category": "dubai",
        "price": 6800000,
        "description": "Borish-qaytish aviachiptasi, 4* mehmonxona, nonushta, transfer va sug‘urta.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-02",
        "title": "Dubay premium dam olish paketi (Atlantis The Palm 5*)",
        "category": "dubai_luxury",
        "price": 18500000,
        "description": "Hashamatli Atlantis mehmonxonasi, akvaparkka bepul kirish, VIP transfer.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-03",
        "title": "Dubay cho‘l safari (Desert Safari Land Cruiser jipida)",
        "category": "excursions",
        "price": 550000,
        "description": "Qum barxanlarida jip minish, tuyada sayr, oqshom shousi va barbekyu kechki ovqat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-04",
        "title": "Burj Khalifa 124-qavatiga kuzatuv maydonchasi chiptasi",
        "category": "tickets",
        "price": 620000,
        "description": "Dunyodagi eng baland bino tepasidan shahar panoramasini tomosha qilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-05",
        "title": "Dubay Marina yaxtasida 2 soatlik oqshom sayri va kechki ovqat",
        "category": "excursions",
        "price": 480000,
        "description": "Ko‘rkam osmono‘par binolar yonidan dengiz sayri va musiqiy dastur.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-06",
        "title": "Dubay Miracle Garden (Mo‘jizalar bog‘i) va Global Village",
        "category": "excursions",
        "price": 390000,
        "description": "Millionlab tabiiy gullardan yasalgan kompozitsiyalar va xalqaro yarmarka.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-07",
        "title": "Sharm-el-Sheyx dengiz bo‘yi sayohati (All Inclusive 7 kun)",
        "category": "egypt",
        "price": 7400000,
        "description": "Qizil dengiz sohilida 5* mehmonxona, 3 mahal taomlar, to‘g‘ridan-to‘g‘ri parvoz.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-08",
        "title": "Qizil dengizda dayving va marjon riflari bo‘ylab kema sayri",
        "category": "activities",
        "price": 420000,
        "description": "Akvang bilan dengiz osti dunyosiga sho‘ng‘ish va rang-barang baliqlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-09",
        "title": "Antaliya (Turkiya) yozgi dam olish paketi (Ultra All Inclusive 7 kun)",
        "category": "turkey",
        "price": 8900000,
        "description": "O‘rta yer dengizi sohilida to‘liq qulaylikdagi oilaviy dam olish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-10",
        "title": "Istanbul madaniy sayohat paketi (4 kun / 3 kecha)",
        "category": "turkey",
        "price": 5200000,
        "description": "Sultonahmad, Ayasofya, Topkapi saroyi va Bosfor bo‘g‘ozi bo‘ylab kema sayri.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-11",
        "title": "Umra ziyorati: Qulay to‘liq paket (14 kunlik)",
        "category": "umrah",
        "price": 14500000,
        "description": "To‘g‘ridan-to‘g‘ri reys, Madinada 4* (3 kun), Makkada 4* (11 kun), tajribali ellikboshi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-12",
        "title": "Umra VIP paketi (Haram yaqinidagi 5* mehmonxonalar)",
        "category": "umrah_vip",
        "price": 21000000,
        "description": "Haram hududiga 50 metr masofadagi premium mehmonxona, maxsus xizmat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-13",
        "title": "BAA (Dubay) elektron vizasini 24 soatda rasmiylashtirish",
        "category": "visa",
        "price": 950000,
        "description": "30 kunlik sayyohlik vizasi, pasport va rasm orqali tezkor chiqadi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-14",
        "title": "Xalqaro sayohat tibbiy sug‘urtasi (15 kunlik polisl)",
        "category": "insurance",
        "price": 110000,
        "description": "Barcha xorijiy davlatlar talabiga mos keluvchi rasmiy sug‘urta.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-15",
        "title": "Dubayda Ferrari World Abu Dhabi akvaparkiga to‘liq kunlik kirish",
        "category": "tickets",
        "price": 1100000,
        "description": "Dunyodagi eng tezkor Formula Rossa attraksioni va Abu Dabi sayohati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-16",
        "title": "Dubayda premium kabriolet avtomobil ijarasi (Ford Mustang 1 kun)",
        "category": "car_rental",
        "price": 1400000,
        "description": "Dubay ko‘chalarida hashamatli avtomobilda erkin harakatlanish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-17",
        "title": "Qohira va Misr ehromlariga 1 kunlik samolyotda ekskursiya",
        "category": "excursions",
        "price": 1800000,
        "description": "Giza piramidalari, Sfinks va Qohira milliy muzeyi ko‘rigi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-18",
        "title": "Malayziya (Kuala-Lumpur + Langkavi) ekzotik turi (8 kun)",
        "category": "asia",
        "price": 11200000,
        "description": "Zamonaviy megapolis va tropik orollarda unutilmas orom.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-19",
        "title": "Tailand (Phuket oroli) tropik sayohat paketi (7 kun)",
        "category": "asia",
        "price": 9800000,
        "description": "Oq qumli plyajlar, tropik mevalar va orollar bo‘ylab qayiq sayohatlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      },
      {
        "id": "dub-20",
        "title": "Gruziya (Tbilisi + Kazbegi tog‘lari) 5 kunlik orombaxsh tur",
        "category": "georgia",
        "price": 5400000,
        "description": "Go‘zal Kavkaz tog‘lari, gruzin mehmondo‘stligi va qadimiy qal’alar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "departure_date",
            "travelers_count",
            "contact_name",
            "phone"
          ],
          "properties": {
            "departure_date": {
              "type": "string",
              "title": "Uchish sanasi (YYYY-MM-DD)"
            },
            "travelers_count": {
              "type": "number",
              "title": "Necha kishi uchadi?",
              "default": 1
            },
            "contact_name": {
              "type": "string",
              "title": "Aloqa uchun ismingiz"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "doc_ready": {
              "type": "boolean",
              "title": "Xorijiy qizil pasportingiz tayyormi?",
              "default": true
            }
          }
        }
      }
    ]
  },
  {
    "slug": "maxway",
    "name": "MaxWay — Burger, Lavash va Fast Food",
    "type": "DELIVERY",
    "category": "food_dining",
    "description": "Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.",
    "rating": 4.9,
    "phone": "+998712005555",
    "hours": "09:00 - 03:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "mw-loc-chilonzor",
        "name": "MaxWay Chilonzor filiali",
        "address": "Toshkent sh., Chilonzor tumani, 9-mavze, 12-uy",
        "lat": 41.278,
        "lng": 69.205,
        "radius": 10
      },
      {
        "id": "mw-loc-amir",
        "name": "MaxWay Amir Temur filiali",
        "address": "Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 45-uy",
        "lat": 41.315,
        "lng": 69.281,
        "radius": 12
      },
      {
        "id": "mw-loc-yunusobod",
        "name": "MaxWay Yunusobod filiali",
        "address": "Toshkent sh., Yunusobod tumani, 11-mavze, Ahmad Donish ko‘chasi",
        "lat": 41.365,
        "lng": 69.29,
        "radius": 10
      }
    ],
    "offerings": [
      {
        "id": "mw-01",
        "title": "Katta mol go‘shtli lavash (Klassik)",
        "category": "lavash",
        "price": 34000,
        "description": "Yupqa xamir, shirali mol go‘shti, barra bodring, pomidor, maxsus sous."
      },
      {
        "id": "mw-02",
        "title": "Pishloqli katta lavash (Cheese Lavash)",
        "category": "lavash",
        "price": 38000,
        "description": "Eritilgan golland pishlog‘i va shirali mol go‘shti bilan."
      },
      {
        "id": "mw-03",
        "title": "Mini lavash mol go‘shtli",
        "category": "lavash",
        "price": 28000,
        "description": "Ixcham va to‘yimli o‘lchamdagi lavash."
      },
      {
        "id": "mw-04",
        "title": "Achchiq lavash (Spicy Jalapeno Lavash)",
        "category": "lavash",
        "price": 36000,
        "description": "Xalapenyo qalampiri va o‘tkir sousli lavash ixlosmandlari uchun."
      },
      {
        "id": "mw-05",
        "title": "Tovuqli katta lavash (Chicken Lavash)",
        "category": "lavash",
        "price": 32000,
        "description": "Yengil va mazali qovurilgan tovuq go‘shti bilan."
      },
      {
        "id": "mw-06",
        "title": "Gamburger mol go‘shtli",
        "category": "burgers",
        "price": 26000,
        "description": "Yumshoq bulochka, shirali kotlet, aysberg salati, sous."
      },
      {
        "id": "mw-07",
        "title": "Chizburger (Pishloqli burger)",
        "category": "burgers",
        "price": 29000,
        "description": "Haqiqiy cheddor pishlog‘i qo‘shilgan mazali burger."
      },
      {
        "id": "mw-08",
        "title": "Dablburger (Ikkita go‘shtli kotlet bilan)",
        "category": "burgers",
        "price": 38000,
        "description": "Katta ishtaha egalari uchun ikki karra shirali go‘sht."
      },
      {
        "id": "mw-09",
        "title": "Big Burger MaxWay Maxsus",
        "category": "burgers",
        "price": 44000,
        "description": "Uch qavatli bulochka, maxsus sous, qo‘shaloq go‘sht va pishloq."
      },
      {
        "id": "mw-10",
        "title": "Klabb sendvich kuritsa bilan",
        "category": "sandwiches",
        "price": 34000,
        "description": "Toster noni, tovuq filesi, tuxum, pishloq, kartoshka fri bilan birga."
      },
      {
        "id": "mw-11",
        "title": "Klassik hot-dog",
        "category": "hotdogs",
        "price": 18000,
        "description": "Sutli sosiska, qarsildoq piyoz, xantal va ketchub sousi."
      },
      {
        "id": "mw-12",
        "title": "Pishloqli qirollik hot-dogi",
        "category": "hotdogs",
        "price": 24000,
        "description": "Katta dudlangan sosiska va eritilgan mo‘l pishloq."
      },
      {
        "id": "mw-13",
        "title": "Shaurma nonida mol go‘shtli",
        "category": "shawarma",
        "price": 32000,
        "description": "Qalinroq pishirilgan xushbo‘y arabcha non ichida go‘sht va sabzavotlar."
      },
      {
        "id": "mw-14",
        "title": "Kartoshka fri (Katta porsiya)",
        "category": "sides",
        "price": 18000,
        "description": "Qarsildoq tilla rangda qovurilgan kartoshka somonchalari."
      },
      {
        "id": "mw-15",
        "title": "Qishloqcha kartoshka (Kartofel po-derevenski)",
        "category": "sides",
        "price": 20000,
        "description": "Ziravorlar va sarimsoq bilan qovurilgan yirik bo‘lakli kartoshka."
      },
      {
        "id": "mw-16",
        "title": "Tovuqli qarsildoq naggets (6 dona)",
        "category": "sides",
        "price": 21000,
        "description": "Oltinrang suxarida qovurilgan nozik tovuq filesi."
      },
      {
        "id": "mw-17",
        "title": "Pishloqli tayoqchalar (Mozzarella sticks 4 dona)",
        "category": "sides",
        "price": 24000,
        "description": "Cho‘ziluvchan mazali mozarella pishlog‘i."
      },
      {
        "id": "mw-18",
        "title": "Coca-Cola 0.5L (Muzdek)",
        "category": "drinks",
        "price": 9000,
        "description": "Gazlangan tetiklashtiruvchi klassik ichimlik."
      },
      {
        "id": "mw-19",
        "title": "Coca-Cola 1.5L",
        "category": "drinks",
        "price": 16000,
        "description": "Katta oila va do‘stlar davrasi uchun."
      },
      {
        "id": "mw-20",
        "title": "Fanta 0.5L apelsin ta’mli",
        "category": "drinks",
        "price": 9000,
        "description": "Yorqin apelsin ta’miga ega tetiklantiruvchi ichimlik."
      },
      {
        "id": "mw-21",
        "title": "Moxito klassik muzli ichimlik 0.4L",
        "category": "drinks",
        "price": 16000,
        "description": "Laym, barra yalpiz va muz bo‘laklari bilan tayyorlangan tetiklik."
      },
      {
        "id": "mw-22",
        "title": "Shokoladli donat (Poncik)",
        "category": "desserts",
        "price": 14000,
        "description": "Ustiga shokolad va rangli sepma sepilgan nozik shirinlik."
      }
    ]
  },
  {
    "slug": "chopar-pizza",
    "name": "Chopar Pizza — Milliy va Italyancha Pitsa",
    "type": "DELIVERY",
    "category": "food_dining",
    "description": "Sharqona lazzat va italyancha an’analar uyg‘unlashgan mazali milliy pitssalar tarmog‘i.",
    "rating": 4.8,
    "phone": "+998712051111",
    "hours": "10:00 - 02:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "cp-loc-markaz",
        "name": "Chopar Navoiy filiali",
        "address": "Toshkent sh., Shayxontohur tumani, Navoiy ko‘chasi, 21-uy",
        "lat": 41.319,
        "lng": 69.251,
        "radius": 10
      },
      {
        "id": "cp-loc-mirzo",
        "name": "Chopar Buyuk Ipak Yo‘li filiali",
        "address": "Toshkent sh., Mirzo Ulug‘bek tumani, Mirzo Ulug‘bek shoh ko‘chasi",
        "lat": 41.325,
        "lng": 69.332,
        "radius": 12
      }
    ],
    "offerings": [
      {
        "id": "cp-01",
        "title": "Katta Chopar Qazili Pitssa (35 sm)",
        "category": "pizza",
        "price": 89000,
        "description": "Haqiqiy ot go‘shti qazisi, mol go‘shti, pomidor va ko‘p pishloq."
      },
      {
        "id": "cp-02",
        "title": "Pepperoni Pitssa (35 sm)",
        "category": "pizza",
        "price": 79000,
        "description": "Qarsildoq xamir, achchiqroq pepperoni kolbasalari, pomidor sousi va mozarella."
      },
      {
        "id": "cp-03",
        "title": "Margarita Klassik Pitssa (30 sm)",
        "category": "pizza",
        "price": 59000,
        "description": "Italyancha pomidor sousi, yangi uzilgan rayhon va mo‘l mozarella pishlog‘i."
      },
      {
        "id": "cp-04",
        "title": "Barbikyu Kuritsa Pitssa (35 sm)",
        "category": "pizza",
        "price": 82000,
        "description": "Dudlangan tovuq filesi, qizil piyoz, shirin bulg‘ori va xushbo‘y barbiqyu sousi."
      },
      {
        "id": "cp-05",
        "title": "4 Pishloq Pitssa (Quattro Formaggi 30 sm)",
        "category": "pizza",
        "price": 85000,
        "description": "Mozarella, dorblyu, parmezan va cheddor pishloqlari uyg‘unligi."
      },
      {
        "id": "cp-06",
        "title": "Go‘shtli Miks Pitssa (Meat Lovers 35 sm)",
        "category": "pizza",
        "price": 92000,
        "description": "Mol go‘shti, kuritsa, vetchina va dudlangan kolbasa bilan to‘yimli pitssa."
      },
      {
        "id": "cp-07",
        "title": "Qo‘ziqorinli va Tovuqli Pitssa (30 sm)",
        "category": "pizza",
        "price": 69000,
        "description": "Barra shampinyon qo‘ziqorinlari, nozik tovuq va qaymoqli oq sous."
      },
      {
        "id": "cp-08",
        "title": "Toshkentcha Pitssa (Milliy 35 sm)",
        "category": "pizza",
        "price": 88000,
        "description": "Qiyma go‘sht, qazi, barra ko‘katlar va piyoz bilan o‘zgacha ta’m."
      },
      {
        "id": "cp-09",
        "title": "Gavayya Pitssa (Ananas va kuritsa 30 sm)",
        "category": "pizza",
        "price": 68000,
        "description": "Shirin ananas bo‘laklari va mayin tovuq go‘shti uyg‘unligi."
      },
      {
        "id": "cp-10",
        "title": "Dengiz mahsulotlari Pitssasi (Seafood 30 sm)",
        "category": "pizza",
        "price": 98000,
        "description": "Krevetkalar, midiyalar, sarimsoqli sous va limon sepmasi."
      },
      {
        "id": "cp-11",
        "title": "Pishloqli Bortik (Pitsaning chetiga eritilgan pishloq qo‘shish)",
        "category": "addons",
        "price": 18000,
        "description": "Xamir chetini ham mazali va pishloqli qilib tayyorlash."
      },
      {
        "id": "cp-12",
        "title": "Chopar Kombo Box (Katta pitsa + fri + 2 dona Cola + sous)",
        "category": "combo",
        "price": 119000,
        "description": "Ikki kishi uchun qulay va tejamkor to‘plam."
      },
      {
        "id": "cp-13",
        "title": "Oilaviy Bayramona Kombo (2 ta katta pitsa + naggets + 1.5L Cola)",
        "category": "combo",
        "price": 195000,
        "description": "Butun oila uchun mo‘l va lazzatli dasturxon."
      },
      {
        "id": "cp-14",
        "title": "Tovuqli qanotlar achchiq barbiqyu sousida (8 dona)",
        "category": "snacks",
        "price": 39000,
        "description": "Pechda qizartirib pishirilgan xushbo‘y qanotlar."
      },
      {
        "id": "cp-15",
        "title": "Pishloqli Kalzone (Yopiq pitsa)",
        "category": "calzone",
        "price": 42000,
        "description": "Ichida issiq eritilgan pishloq va go‘sht saqlanib qolgan yopiq xamir."
      },
      {
        "id": "cp-16",
        "title": "Sezar salati tovuq filesi bilan",
        "category": "salads",
        "price": 36000,
        "description": "Aysberg, parmezan, sarimsoqli suxariklar va klassik sezar sousi."
      },
      {
        "id": "cp-17",
        "title": "Grecheskiy barra sabzavotli salat",
        "category": "salads",
        "price": 32000,
        "description": "Feta pishlog‘i, zaytun mevasi, bodring va zaytun moyi."
      },
      {
        "id": "cp-18",
        "title": "Sarimsoqli pishloqli non (Fokachcha)",
        "category": "bread",
        "price": 19000,
        "description": "Zaytun moyi va rozmarin sepib pishirilgan italyancha xushbo‘y non."
      },
      {
        "id": "cp-19",
        "title": "Pishloqli sous va Maxsus Chopar sousi",
        "category": "sauces",
        "price": 5000,
        "description": "Pitssaga botirib yeyish uchun ajoyib qo‘shimcha."
      },
      {
        "id": "cp-20",
        "title": "Karamelli shirin pirog bo‘lagi",
        "category": "desserts",
        "price": 22000,
        "description": "Yong‘oqli va karamelli shirin xamirli pishiriq."
      }
    ]
  },
  {
    "slug": "coffee-time",
    "name": "Coffee Time — Qahvaxona va Qandolatchilik",
    "type": "DELIVERY",
    "category": "food_dining",
    "description": "Yangi qovurilgan sara arabika kofesi, xushbo‘y nonushtalar va nozik fransuz desertlari maskani.",
    "rating": 4.9,
    "phone": "+998712007788",
    "hours": "08:00 - 23:00",
    "baseUrl": "https://coffee-time-sandbox.shopla.uz",
    "locations": [
      {
        "id": "ct-loc-sayilgoh",
        "name": "Coffee Time Sayilgoh (Broadway)",
        "address": "Toshkent sh., Yunusobod tumani, Sayilgoh ko‘chasi, 10-uy",
        "lat": 41.314,
        "lng": 69.274,
        "radius": 10
      },
      {
        "id": "ct-loc-tashselmash",
        "name": "Coffee Time Parkent filiali",
        "address": "Toshkent sh., Yashnobod tumani, Parkent ko‘chasi, 180-uy",
        "lat": 41.309,
        "lng": 69.319,
        "radius": 10
      }
    ],
    "offerings": [
      {
        "id": "ct-01",
        "title": "Klassik Kapuchino (300 ml)",
        "category": "coffee",
        "price": 24000,
        "description": "Yangi tortilgan espresso va mayin baxmal sut ko‘pigi."
      },
      {
        "id": "ct-02",
        "title": "Katta Kapuchino (450 ml)",
        "category": "coffee",
        "price": 29000,
        "description": "Uzoq davom etuvchi quvvat va lazzat."
      },
      {
        "id": "ct-03",
        "title": "Karamelli Latte Makkiato (350 ml)",
        "category": "coffee",
        "price": 28000,
        "description": "Tabiiy karamel siropi va nozik sut qatlamlari."
      },
      {
        "id": "ct-04",
        "title": "Amerikano qora kofe (250 ml)",
        "category": "coffee",
        "price": 19000,
        "description": "Kuchli va to‘yingan haqiqiy 100% Arabika espressosi."
      },
      {
        "id": "ct-05",
        "title": "Flat White (Ikki hissa espresso bilan)",
        "category": "coffee",
        "price": 27000,
        "description": "Kuchli kofe ta’mini yoqtiruvchilar uchun yupqa sut qatlami bilan."
      },
      {
        "id": "ct-06",
        "title": "Raff kofe vanilli (Qaymoqli kofe)",
        "category": "coffee",
        "price": 32000,
        "description": "Qaymoq va tabiiy vanil bilan birga ko‘pirtirilgan o‘ta mayin ichimlik."
      },
      {
        "id": "ct-07",
        "title": "Ispancha Kortado kofesi",
        "category": "coffee",
        "price": 22000,
        "description": "Teng miqdordagi espresso va issiq sut."
      },
      {
        "id": "ct-08",
        "title": "Sovuq Ays-Latte muz bilan (Muzdek)",
        "category": "cold_coffee",
        "price": 28000,
        "description": "Issiq kunlarda chanqoqbosdi tetiklashtiruvchi kofe."
      },
      {
        "id": "ct-09",
        "title": "Ays-Karamel Frappuchino qaymoq bilan",
        "category": "cold_coffee",
        "price": 34000,
        "description": "Muz bilan maydalangan shirin kofe va ustida shanti qaymog‘i."
      },
      {
        "id": "ct-10",
        "title": "Bumble kofe (Espresso + Tabiiy Apelsin sharbati)",
        "category": "cold_coffee",
        "price": 32000,
        "description": "Nordon va achchiq ta’mning ajoyib tetiklashtiruvchi kontrasti."
      },
      {
        "id": "ct-11",
        "title": "Matcha Latte yapon ko‘k choyi bilan",
        "category": "tea",
        "price": 30000,
        "description": "Antioksidantlarga boy tabiiy yapon yashil matchasi sut bilan."
      },
      {
        "id": "ct-12",
        "title": "Qora / Ko‘k choy choynakda tog‘ giyohlari bilan",
        "category": "tea",
        "price": 20000,
        "description": "Yalpiz, tog‘choy (timyan) va limon bilan damlangan choy."
      },
      {
        "id": "ct-13",
        "title": "Fransuzcha sariyog‘li kruassan",
        "category": "bakery",
        "price": 18000,
        "description": "Qat-qat qarsildoq xamir va haqiqiy sariyog‘ isi."
      },
      {
        "id": "ct-14",
        "title": "Shokoladli Nutella bilan to‘ldirilgan kruassan",
        "category": "bakery",
        "price": 24000,
        "description": "Ichida mo‘l-ko‘l iliq shokolad kremi."
      },
      {
        "id": "ct-15",
        "title": "San-Sebastian pishloqli chizkeyki",
        "category": "desserts",
        "price": 36000,
        "description": "Kuygan karamel po‘sti ostidagi nozik qaymoqli pishloq kremi."
      },
      {
        "id": "ct-16",
        "title": "Klassik Nyu-York chizkeyk mevali qiyom bilan",
        "category": "desserts",
        "price": 34000,
        "description": "Filadelfiya pishlog‘i va qulupnayli jem."
      },
      {
        "id": "ct-17",
        "title": "Tiramisu an’anaviy italyancha desert",
        "category": "desserts",
        "price": 32000,
        "description": "Savoyardi pechenyesi, maskarpone pishlog‘i va kofe shimdirilgan."
      },
      {
        "id": "ct-18",
        "title": "Avokado va qizil baliqli (losos) brusketta",
        "category": "breakfast",
        "price": 48000,
        "description": "Qarsildoq baget noni ustida ezilgan avokado va kam tuzlangan baliq."
      },
      {
        "id": "ct-19",
        "title": "Inglizcha to‘liq nonushta (Tuxum, kolbasa, loviya, qo‘ziqorin)",
        "category": "breakfast",
        "price": 52000,
        "description": "Kun bo‘yi quvvat beruvchi to‘yimli va foydali nonushta."
      },
      {
        "id": "ct-20",
        "title": "Suli yormasidan (Ovsyanka) yong‘oqli va mevali bo‘tqa",
        "category": "breakfast",
        "price": 26000,
        "description": "Asal, banan va rezavor mevalar bilan pishirilgan foydali taom."
      }
    ]
  },
  {
    "slug": "flowerlab",
    "name": "FlowerLab — Gullar va Sovg‘alar Do‘koni",
    "type": "DELIVERY",
    "category": "flowers_gifts",
    "description": "Gollandiyadan keltirilgan eng sarxil gullar, bayramona guldastalar va 24 soatlik xushmuomala yetkazib berish xizmati.",
    "rating": 4.9,
    "phone": "+998901112233",
    "hours": "24/7",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "fl-loc-markaz",
        "name": "FlowerLab Markaziy Butik",
        "address": "Toshkent sh., Mirobod tumani, Sodiq Azimov ko‘chasi, 68-uy",
        "lat": 41.305,
        "lng": 69.288,
        "radius": 25
      }
    ],
    "offerings": [
      {
        "id": "fl-01",
        "title": "101 ta qizil Golland atirguli (Premium qizil guldasta)",
        "category": "roses",
        "price": 1450000,
        "description": "Balandligi 70 sm bo‘lgan uzun poyali, ochilmagan sarxil atirgullar to‘plami.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-02",
        "title": "51 ta qizil va oq atirgulli yurak shaklidagi guldasta",
        "category": "roses",
        "price": 820000,
        "description": "Muhabbat va ehtirom izhori uchun eng go‘zal sovg‘a.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-03",
        "title": "25 ta qizil atirgul atlas lenta bilan",
        "category": "roses",
        "price": 380000,
        "description": "Ixcham, bejirim va nafis klassik guldasta.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-04",
        "title": "Pion guldastasi (Sarah Bernhardt 15 dona)",
        "category": "peonies",
        "price": 750000,
        "description": "Xushbo‘y hidli, och pushti rangdagi hashamatli pionlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-05",
        "title": "25 ta bahoriy golland lolasi (Rang-barang miks)",
        "category": "tulips",
        "price": 320000,
        "description": "Sariq, qizil va binafsharang lola guldastasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-06",
        "title": "Shlyapa qutisidagi hashamatli gul kompozitsiyasi (Hat Box)",
        "category": "box_flowers",
        "price": 490000,
        "description": "Suvli maxsus gubka ichida joylashtirilgan, vaza talab qilmaydigan gullar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-07",
        "title": "Gipsofila kamalakrang bulutli guldasta (Rainbow Gypsophila)",
        "category": "modern",
        "price": 290000,
        "description": "Oylab qurib so‘lmaydigan zamonaviy yengil va rangli guldasta.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-08",
        "title": "Eustoma (Lisianthus) nafis oq va binafsha guldasta",
        "category": "bouquets",
        "price": 360000,
        "description": "Uzoq vaqt yangidek turuvchi juda muloyim gullar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-09",
        "title": "Orxideya guli sopol tuvakda (Phalaenopsis 2 shoxli)",
        "category": "potted",
        "price": 260000,
        "description": "Uy va ofis uchun uzoq muddat gullab turuvchi jonli gul.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-10",
        "title": "Ferrero Rocher shokoladlari bilan bezatilgan guldasta",
        "category": "sweet_bouquets",
        "price": 420000,
        "description": "Ham shirin, ham ko‘rkam kutilmagan sovg‘a.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-11",
        "title": "Katta ayiqcha (Teddy Bear 1 metr) va gul to‘plami",
        "category": "gifts",
        "price": 580000,
        "description": "Yumshoq oq ayiqcha va 15 ta qizil atirgul.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-12",
        "title": "Gellar bilan to‘ldirilgan uchuvchi sharlar (15 dona)",
        "category": "balloons",
        "price": 180000,
        "description": "Yaltiroq xrom sharlar va bayramona tabriknoma.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-13",
        "title": "Kelinchak guldastasi (Wedding Bridal Bouquet)",
        "category": "wedding",
        "price": 450000,
        "description": "Oq freziyalar, mayda atirgullar va evkalipt novdalari bilan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-14",
        "title": "Erkaklar uchun ekzotik guldasta (Anturium va paxta guli)",
        "category": "men_flowers",
        "price": 340000,
        "description": "Jiddiy, vazmin va zamonaviy uslubdagi sovg‘a.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-15",
        "title": "Quritilgan gullardan (Lavanda va paxta) ekologik guldasta",
        "category": "dried_flowers",
        "price": 220000,
        "description": "Fransuzcha lavanda xushbo‘yligi va 2 yilgacha saqlanish muddati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-16",
        "title": "Eksklyuziv yog‘och qutida gullar va makaron shirinliklari",
        "category": "box_flowers",
        "price": 410000,
        "description": "Fransuzcha shirin pechenyelar va yangi gullar to‘plami.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-17",
        "title": "Mini guldasta kofe stakanida",
        "category": "mini",
        "price": 95000,
        "description": "Kichik, yoqimli va kayfiyatni ko‘taruvchi kutilmagan sovg‘a.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-18",
        "title": "Katta tantanalar uchun gulli arka va fotogona bezatish",
        "category": "decor",
        "price": 2500000,
        "description": "To‘y va ochilish marosimlari uchun professional floristlar xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-19",
        "title": "Maxsus yozuvli tabriknoma (Calligraphy Card)",
        "category": "cards",
        "price": 25000,
        "description": "Chiroyli husnixat bilan qo‘lda yozilgan samimiy tilaklar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      },
      {
        "id": "fl-20",
        "title": "Shoshilinch anonim yetkazib berish (1 soat ichida)",
        "category": "delivery",
        "price": 50000,
        "description": "Yuboruvchi ismini sir saqlagan holda manzilga tantanali topshirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_phone",
            "recipient_name",
            "card_text"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchining ismi"
            },
            "recipient_phone": {
              "type": "string",
              "title": "Qabul qiluvchining telefoni"
            },
            "delivery_time": {
              "type": "string",
              "title": "Yetkazish vaqti (masalan: 18:00 gacha)"
            },
            "card_text": {
              "type": "string",
              "title": "Tabriknomaga yoziladigan so‘zlar"
            },
            "anonymous": {
              "type": "boolean",
              "title": "Anonim yetkazilsinmi (Ismingiz sir saqlansin)?",
              "default": false
            }
          }
        }
      }
    ]
  },
  {
    "slug": "bookly",
    "name": "Bookly — Kitoblar Do‘koni va Badiiy Adabiyot",
    "type": "DELIVERY",
    "category": "books_education",
    "description": "O‘zbek va jahon adabiyoti durdonalari, biznes, psixologiya, IT va bolalar uchun eng sara kitoblar yetkazish xizmati.",
    "rating": 4.9,
    "phone": "+998712001515",
    "hours": "09:00 - 21:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "bk-loc-chilonzor",
        "name": "Bookly Chilonzor Markazi",
        "address": "Toshkent sh., Chilonzor tumani, Chilonzor metro yaqinida",
        "lat": 41.275,
        "lng": 69.205,
        "radius": 20
      },
      {
        "id": "bk-loc-tsum",
        "name": "Bookly TSUM filiali",
        "address": "Toshkent sh., Mirobod tumani, Matbuotchilar ko‘chasi",
        "lat": 41.309,
        "lng": 69.271,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "bk-01",
        "title": "Atom odatlar — Jeyms Klir (O‘zbek tilida)",
        "category": "psychology",
        "price": 65000,
        "description": "Kichik o‘zgarishlar qanday qilib ulkan natijalarga olib kelishi haqida jahon bestselleri."
      },
      {
        "id": "bk-02",
        "title": "Diqqat: Chalg‘ituvchi dunyoda muvaffaqiyat sirlari — Kel Nyuport",
        "category": "productivity",
        "price": 58000,
        "description": "Chuqur ishlash va chalg‘imasdan samaradorlikka erishish qo‘llanmasi."
      },
      {
        "id": "bk-03",
        "title": "Boy ota, kambag‘al ota — Robert Kiyosaki",
        "category": "finance",
        "price": 55000,
        "description": "Moliyaviy savodxonlik, aktivlar va passivlar haqidagi eng mashhur kitob."
      },
      {
        "id": "bk-04",
        "title": "Stiv Jobs — Uolter Ayzekson (Mukammal tarjimai hol)",
        "category": "biography",
        "price": 110000,
        "description": "Apple asoschisining hayoti, xarakteri va innovatsiyalari tarixi."
      },
      {
        "id": "bk-05",
        "title": "Ilon Mask — Uolter Ayzekson",
        "category": "biography",
        "price": 125000,
        "description": "Tesla, SpaceX va zamonamizning eng shov-shuvli tadbirkori haqida kitob."
      },
      {
        "id": "bk-06",
        "title": "Alximik — Paulo Koelo",
        "category": "fiction",
        "price": 42000,
        "description": "O‘z orzusi ortidan borgan andalusiyalik cho‘pon yigit haqida falsafiy asar."
      },
      {
        "id": "bk-07",
        "title": "O‘tkan kunlar — Abdulla Qodiriy (Qattiq muqovada)",
        "category": "classics",
        "price": 48000,
        "description": "O‘zbek adabiyotining ilk romani, Otabek va Kumush muhabbati."
      },
      {
        "id": "bk-08",
        "title": "Mehrobdan chayon — Abdulla Qodiriy",
        "category": "classics",
        "price": 45000,
        "description": "Xudoyorxon davridagi saroy fitnalari va pok muhabbat qissasi."
      },
      {
        "id": "bk-09",
        "title": "Yulduzli tunlar (Bobur) — Pirimqul Qodirov",
        "category": "historical",
        "price": 75000,
        "description": "Zahiriddin Muhammad Boburning murakkab hayoti va saltanat fojiasi."
      },
      {
        "id": "bk-10",
        "title": "Rework: Biznesni boshqacha yuritish qoidalari — Jeyson Frayd",
        "category": "business",
        "price": 52000,
        "description": "Ortiqcha byurokratiyasiz zamonaviy biznes qurish yo‘llari."
      },
      {
        "id": "bk-11",
        "title": "Noldan birga: Kelajak startaplari qanday quriladi — Piter Til",
        "category": "business",
        "price": 62000,
        "description": "Monopoliya yaratish va yangi texnologiyalar yaratish sirlari."
      },
      {
        "id": "bk-12",
        "title": "Grokking Algorithms (Algoritmlarni tushunish) — Aditya Bxargava",
        "category": "it_coding",
        "price": 95000,
        "description": "Dasturchilar uchun illyustratsiyalar bilan sodda tushuntirilgan algoritmlar."
      },
      {
        "id": "bk-13",
        "title": "Toza kod (Clean Code) — Robert Martin",
        "category": "it_coding",
        "price": 130000,
        "description": "Professional dasturiy ta’minot yaratishning oltin qoidalari."
      },
      {
        "id": "bk-14",
        "title": "Sapiens: Insoniyatning qisqacha tarixi — Yuval Noy Xarari",
        "category": "history",
        "price": 88000,
        "description": "Qadimgi odamlardan to sun’iy intellekt davrigacha bo‘lgan buyuk evolyutsiya."
      },
      {
        "id": "bk-15",
        "title": "Kichkina Shahzoda — Antuan de Sent-Ekzyuperi (Rangli rasmlar bilan)",
        "category": "kids",
        "price": 38000,
        "description": "Kattalar va bolalar uchun qalb ko‘zi bilan ko‘rish saboqlari."
      },
      {
        "id": "bk-16",
        "title": "Garri Potter va hikmatlar toshi — J.K. Rouling",
        "category": "fantasy",
        "price": 72000,
        "description": "Sehrgarlar olamining birinchi jildi (o‘zbek tilida)."
      },
      {
        "id": "bk-17",
        "title": "Bolalar uchun katta ensiklopediya (Koinot, Yer va Hayvonot)",
        "category": "kids_enc",
        "price": 95000,
        "description": "Rang-barang qiziqarli rasmlar va kashfiyotlar kitobi."
      },
      {
        "id": "bk-18",
        "title": "Ingliz tili grammatikasi — Raymond Murphy (English Grammar in Use)",
        "category": "languages",
        "price": 85000,
        "description": "Dunyo bo‘yicha eng mashhur ko‘k rangli ingliz tili darsligi."
      },
      {
        "id": "bk-19",
        "title": "Sovg‘abop kitob qutisi va atlas lenta bilan o‘rash xizmati",
        "category": "gift_wrap",
        "price": 25000,
        "description": "Kitobni sovg‘a sifatida chiroyli qadoqlash."
      },
      {
        "id": "bk-20",
        "title": "Charm qoplamali qimmatbaho xatcho‘p (Bookmark)",
        "category": "accessories",
        "price": 20000,
        "description": "Kitobxonlar uchun tabiiy charmdan qilingan nafis esdalik."
      }
    ]
  },
  {
    "slug": "bizreg",
    "name": "BizReg — Biznes Ro‘yxatdan O‘tkazish va Konsalting",
    "type": "SERVICES",
    "category": "business_services",
    "description": "O‘zbekistonda MChJ va YaTT ochish, litsenziyalar, hisob raqam ochish va to‘liq buxgalteriya autsorsingi.",
    "rating": 4.9,
    "phone": "+998712000101",
    "hours": "09:00 - 18:00",
    "baseUrl": "https://poyez-sandbox.shopla.uz",
    "locations": [
      {
        "id": "br-loc-markaz",
        "name": "BizReg Konsalting Bosh Ofisi",
        "address": "Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 29-uy, 4-qavat",
        "lat": 41.291,
        "lng": 69.278,
        "radius": 30
      }
    ],
    "offerings": [
      {
        "id": "br-01",
        "title": "MChJni (OOO) davlat ro‘yxatidan o‘tkazish (To‘liq kalit topshirish)",
        "category": "registration",
        "price": 650000,
        "description": "Ustav, ta’sis shartnomasi, davlat boji, muhr va yuridik maslahat kiritilgan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-02",
        "title": "YaTT (Yakka tartibdagi tadbirkor) ro‘yxatdan o‘tkazish (1 soatda)",
        "category": "registration",
        "price": 250000,
        "description": "Davlat xizmatlari orqali tezkor ochish va soliq rejimini to‘g‘ri tanlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-03",
        "title": "Bankda hisob-raqam ochishda hamrohlik va korporativ karta olish",
        "category": "banking",
        "price": 150000,
        "description": "Eng ma’qul tarifdagi bankni tanlash va navbatsiz hisob ochish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-04",
        "title": "Kompaniya ustaviga o‘zgartirish kiritish va qayta ro‘yxatdan o‘tkazish",
        "category": "legal",
        "price": 450000,
        "description": "Ta’sischilar o‘zgarishi, ustav fondini oshirish yoki yuridik manzilni yangilash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-05",
        "title": "MChJ direktori (rahbari)ni rasmiy almashtirish xizmati",
        "category": "legal",
        "price": 300000,
        "description": "Qaror, buyruq tayyorlash va soliq/statistika bazasida yangilash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-06",
        "title": "Oylik buxgalteriya autsorsingi (Kichik biznes uchun)",
        "category": "accounting",
        "price": 1200000,
        "description": "Barcha soliq hisobotlari, oylik maosh hisobi, bank-klient boshqaruvi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-07",
        "title": "Buxgalteriya hisobini noldan tiklash (o‘tgan davrlar uchun)",
        "category": "accounting",
        "price": 2500000,
        "description": "Yig‘ilib qolgan xatoliklarni bartaraf etish va soliqlarni to‘g‘rilash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-08",
        "title": "1C Buxgalteriya dasturini o‘rnatish va korxonaga moslashtirish",
        "category": "it_business",
        "price": 1800000,
        "description": "1C 8.3 bazasini sozlash, xodimlarni o‘rgatish va birlamchi kiritish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-09",
        "title": "Elektron raqamli imzo (ERI kalit) olishda amaliy yordam",
        "category": "e_gov",
        "price": 80000,
        "description": "Yuridik yoki jismoniy shaxs uchun E-IMZO olish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-10",
        "title": "Tovarmarka (Brend logotipi)ni patentlash va ro‘yxatdan o‘tkazish",
        "category": "intellectual",
        "price": 1950000,
        "description": "Adliya vazirligida intellektual mulk himoyasi, tovar belgisini tekshirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-11",
        "title": "Yuridik manzil taqdim etish (Arenga yuridik manzil 1 yilga)",
        "category": "legal_address",
        "price": 2400000,
        "description": "MChJ ro‘yxatdan o‘tishi uchun rasmiy ijara shartnomasi va pochta xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-12",
        "title": "Ulguvji savdo / Chakana savdo litsenziyasi va ruxsatnomalari",
        "category": "licenses",
        "price": 850000,
        "description": "Faoliyat turlari bo‘yicha davlat litsenziyalarini olish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-13",
        "title": "Kassa apparati (Onlayn NKM / Virtual kassa)ni ro‘yxatdan o‘tkazish",
        "category": "pos_cash",
        "price": 350000,
        "description": "Soliq organlarida fiskal chek apparatini faollashtirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-14",
        "title": "E-ijara tizimida ijara shartnomasini ro‘yxatdan o‘tkazish",
        "category": "taxes",
        "price": 120000,
        "description": "Ijara.soliq.uz portalida barcha talablar bilan rasmiylashtirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-15",
        "title": "Soliq auditi va tekshiruvdan oldingi ekspress-tekshiruv",
        "category": "audit",
        "price": 1500000,
        "description": "Soliq jarimalarining oldini olish uchun ichki xavflarni tahlil qilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-16",
        "title": "E-Auksion platformasida ishtirok etish uchun tayyorgarlik",
        "category": "auction",
        "price": 400000,
        "description": "Yer, bino yoki mulk auksionlarida qatnashish arizasini berish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-17",
        "title": "Kompaniyani ixtiyoriy tugatish (Yopish / Likvidatsiya)",
        "category": "liquidation",
        "price": 3500000,
        "description": "Audit tekshiruvidan o‘tkazib, MChJni qonuniy to‘liq yopish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-18",
        "title": "Xorijiy investorlar uchun O‘zbekistonda kompaniya ochish (Qo‘shma korxona)",
        "category": "foreign_invest",
        "price": 2200000,
        "description": "Xorijiy fuqarolarga PINFL olish, viza yordami va korxona ochish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-19",
        "title": "Mehnat shartnomalari va buyruqlarni (my.mehnat.uz) yuritish",
        "category": "hr",
        "price": 250000,
        "description": "Xodimlarni ishga olish, bo‘shatish va elektron mehnat daftarchasini yuritish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      },
      {
        "id": "br-20",
        "title": "Biznes-reja va bank krediti uchun moliyaviy model tayyorlash",
        "category": "business_plan",
        "price": 1800000,
        "description": "Kredit va investitsiya jalb qilish uchun hisob-kitobli professional reja.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "company_name",
            "activity_type",
            "applicant_name",
            "phone"
          ],
          "properties": {
            "company_name": {
              "type": "string",
              "title": "Rejalashtirilgan korxona yoki brend nomi"
            },
            "activity_type": {
              "type": "string",
              "title": "Faoliyat sohasi (masalan: IT xizmatlar, savdo, umumiy ovqatlanish)"
            },
            "applicant_name": {
              "type": "string",
              "title": "Murojaatchi ismi"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "tax_regime": {
              "type": "string",
              "enum": [
                "Aylanmadan olinadigan soliq (4%)",
                "QQS (12%) va Foyda solig‘i",
                "Maslahat kerak"
              ],
              "title": "Ma’qul soliq rejimi"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "cleanpro",
    "name": "CleanPro — Tozalash va Klining Xizmati",
    "type": "SERVICES",
    "category": "home_services",
    "description": "Xonadon, kottej va ofislarni professional tozalash, kimyoviy tozalash va dezinfeksiya xizmati.",
    "rating": 4.8,
    "phone": "+998712006677",
    "hours": "08:00 - 20:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "cl-loc-markaz",
        "name": "CleanPro Markaziy Ofisi",
        "address": "Toshkent sh., Yakkasaroy tumani, Bobur ko‘chasi, 40-uy",
        "lat": 41.285,
        "lng": 69.255,
        "radius": 30
      }
    ],
    "offerings": [
      {
        "id": "cl-01",
        "title": "Kvartirani umumiy boshdan-oyoq tozalash (General cleaning 1 xona)",
        "category": "residential",
        "price": 350000,
        "description": "Changlarni artish, pol yuvish, deraza va eshiklarni tozalash, sanuzel dezinfeksiyasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-02",
        "title": "2 xonali kvartirani to‘liq general tozalash",
        "category": "residential",
        "price": 480000,
        "description": "Barcha xonalar, oshxona mebeli va sanuzelni to‘liq tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-03",
        "title": "3 xonali kvartirani to‘liq general tozalash",
        "category": "residential",
        "price": 620000,
        "description": "Katta oilaviy xonadonlar uchun 2-3 kishilik mutaxassislar guruhi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-04",
        "title": "Ta’mirdan (remontdan) keyingi professional tozalash (1 kv.m)",
        "category": "post_renovation",
        "price": 15000,
        "description": "Kraska, sement, shpaklyovka dog‘larini maxsus vositalar bilan ketkazish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-05",
        "title": "Hovli va kottejlarni to‘liq tozalash (1 kv.m)",
        "category": "cottage",
        "price": 12000,
        "description": "Katta maydondagi uylar, zinapoyalar va xonalarni tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-06",
        "title": "Ofislarni kunlik / oylik shartnoma asosida tozalash",
        "category": "office",
        "price": 400000,
        "description": "Ish stollari, pollar, axlatlarni chiqarish va tozalik saqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-07",
        "title": "Yumshoq mebellarni (divan) joyida kimyoviy tozalash (Ximchistka)",
        "category": "upholstery",
        "price": 220000,
        "description": "Karcher apparati va xavfsiz nemis shampunlari bilan dog‘larni yo‘qotish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-08",
        "title": "Katta burchakli divanni (Ugolok) kimyoviy tozalash",
        "category": "upholstery",
        "price": 320000,
        "description": "Barcha yostiqlari bilan birga chuqur kirlardan tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-09",
        "title": "Matraslarni ikki tomonlama chuqur chang va bakteriyalardan tozalash",
        "category": "upholstery",
        "price": 180000,
        "description": "Chang kanalariga qarshi antibakterial bug‘ bilan ishlov berish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-10",
        "title": "Gilamlarni olib ketib, fabrikada yuvish va quritish (1 kv.m)",
        "category": "carpet",
        "price": 18000,
        "description": "Maxsus avtomat stanoklarda yuvish, xushbo‘y hid va qadoqlab yetkazish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-11",
        "title": "Derazalarni ikki tomonlama yuvish (1 dona standart oyna)",
        "category": "windows",
        "price": 35000,
        "description": "Ramkasi, oynasi va panjaralarni xiralik qoldirmay yaltiratish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-12",
        "title": "Baland qavatlardagi panoramali oynalarni yuvish",
        "category": "windows",
        "price": 70000,
        "description": "Xavfsizlik kamarlari va professional uskunalar bilan yuvish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-13",
        "title": "Oshxona plitasi, duxovka va dudburonni yog‘lardan tozalash",
        "category": "kitchen_deep",
        "price": 160000,
        "description": "Yillab yig‘ilgan qotgan yog‘ qatlamlarini tozalovchi kimyo bilan eritish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-14",
        "title": "Muzlatkichni ichki qismini tozalash va hidini yo‘qotish",
        "category": "appliances",
        "price": 80000,
        "description": "Tokchalarni yuvish, mog‘or va yoqimsiz hidlarni bartaraf qilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-15",
        "title": "Vanna xonasi va hojatxonani kalsiy toshlaridan chuqur tozalash",
        "category": "sanitary",
        "price": 150000,
        "description": "Kafel, dush kabinasi va unitazdagi sariq dog‘larni tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-16",
        "title": "Kvartirani zararkunandalarga (tarakan, klopa) qarshi dezinfeksiya qilish",
        "category": "disinfection",
        "price": 250000,
        "description": "Hidsiz sovuq tuman (Cold fog) usulida 100% kafolatli yo‘qotish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-17",
        "title": "Kvartirada yoqimsiz hidlarni quruq tuman (Dry fog) bilan yo‘qotish",
        "category": "odor_removal",
        "price": 180000,
        "description": "Tamaki, kuyindi va namlik hidini yo‘qotib, xushbo‘ylantirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-18",
        "title": "Dazmollash xizmati (Kiyimlar va parda dazmollash 1 soat)",
        "category": "ironing",
        "price": 60000,
        "description": "Bug‘li dazmol bilan tartibli taxlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-19",
        "title": "Hovuzlarni (Basseyn) tozalash va suvini xlorlash",
        "category": "pool",
        "price": 450000,
        "description": "Suv o‘tlari va devordagi kirlarni tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      },
      {
        "id": "cl-20",
        "title": "Ekspress tozalash (Mijoz chaqirganda 1 soatda yetib borish)",
        "category": "express_clean",
        "price": 120000,
        "description": "Shoshilinch mehmon kutish oldidan tezkor yordam.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "cleaning_address",
            "preferred_date",
            "contact_phone"
          ],
          "properties": {
            "cleaning_address": {
              "type": "string",
              "title": "Tozalanishi kerak bo‘lgan manzil"
            },
            "preferred_date": {
              "type": "string",
              "title": "Tozalash sanasi (YYYY-MM-DD)"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqamingiz"
            },
            "area_sqm": {
              "type": "number",
              "title": "Maydon o‘lchami (taxminan kv.m)"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "umrah-travel",
    "name": "Safar Umrah — Umra va Haj Ziyorat Sayyohligi",
    "type": "BOOKINGS",
    "category": "travel_tourism",
    "description": "Umra va Haj ziyoratlari bo‘yicha to‘liq xizmatlar: to‘g‘ridan-to‘g‘ri reyslar, Makka va Madinada 4-5 yulduzli mehmonxonalar, tajribali ellikboshilar hamrohligi.",
    "rating": 4.96,
    "phone": "+998712007788",
    "hours": "09:00 - 20:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "umr-loc-toshkent",
        "name": "Safar Umrah Toshkent Bosh Ofisi",
        "address": "Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 29-uy",
        "lat": 41.291,
        "lng": 69.272,
        "radius": 30
      },
      {
        "id": "umr-loc-samarqand",
        "name": "Safar Umrah Samarqand filiali",
        "address": "Samarqand sh., Registon ko‘chasi, 14-uy",
        "lat": 39.654,
        "lng": 66.975,
        "radius": 30
      }
    ],
    "offerings": [
      {
        "id": "umr-01",
        "title": "Umra Ekonom Paketi (14 kun)",
        "category": "package",
        "price": 14500000,
        "description": "Aviachipta, 3 yulduzli mehmonxona, viza, transfer, ellikboshi xizmati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-02",
        "title": "Umra Standart Paketi (14 kun)",
        "category": "package",
        "price": 17500000,
        "description": "To‘g‘ridan-to‘g‘ri reys, 4 yulduzli mehmonxona (Haramga 800m), kunlik 2 mahal taom.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-03",
        "title": "Umra Komfort Paketi (14 kun)",
        "category": "package",
        "price": 21500000,
        "description": "Haramga yaqin 5 yulduzli mehmonxona, shved stoli, qulay transferlar va sovg‘alar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-04",
        "title": "Umra VIP Paketi (10 kun)",
        "category": "package",
        "price": 32000000,
        "description": "Al-Safwa yoki Hilton mehmonxonalari (Haram ro‘parasida), biznes-klass aviaparvoz, shaxsiy transfer.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-05",
        "title": "Umra Ramazon Paketi (Ohirgi 10 kunlik)",
        "category": "package",
        "price": 28000000,
        "description": "Qadr kechalari Makka va Madinada bo‘lish imkoniyati, iftorlik va saharliklar bilan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-06",
        "title": "Umra Oilaviy Paketi (4 kishilik oila uchun 14 kun)",
        "category": "family_package",
        "price": 68000000,
        "description": "Alohida 4 kishilik oilaviy xona, qulay transport va maxsus xizmat ko‘rsatish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-07",
        "title": "Makka shahridagi ziyoratlar ekskursiyasi",
        "category": "excursion",
        "price": 650000,
        "description": "Savr tog‘i, Nur tog‘i (Hiro g‘ori), Mino, Muzdalifa va Arofat vodiylariga ziyorat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-08",
        "title": "Madina shahridagi muqaddas qadamjolar ziyorati",
        "category": "excursion",
        "price": 650000,
        "description": "Uhud tog‘i va shahidlari, Qubo masjidi, Qiblatayn masjidi va Xurmo bog‘lari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-09",
        "title": "Qizil dengiz sohiliga sayohat (Jidda shahri)",
        "category": "excursion",
        "price": 850000,
        "description": "Qadimgi Al-Balad tarixiy shaharchasi, Suzuvchi masjid va Qizil dengiz qirg‘og‘i bo‘ylab sayr.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-10",
        "title": "Badr jangi maydoni va shuxadolar ziyorati",
        "category": "excursion",
        "price": 750000,
        "description": "Tarixiy Badr maydoniga maxsus avtobusda tashkil etilgan ilmiy-tarixiy safar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-11",
        "title": "To‘g‘ridan-to‘g‘ri Toshkent - Jidda aviaparvozi chiptasi",
        "category": "flight",
        "price": 8900000,
        "description": "To‘g‘ridan-to‘g‘ri qulay charter yoki muntazam reys, 25kg yuk bilan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-12",
        "title": "Saudiya Arabistoni elektron Umra vizasi",
        "category": "visa",
        "price": 2100000,
        "description": "1 yillik ko‘p martalik (multiple) kirish huquqini beruvchi rasmiy elektron viza va sug‘urta.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-13",
        "title": "VIP Shaxsiy transfer (Jidda aeroporti - Makka mehmonxona)",
        "category": "transfer",
        "price": 1400000,
        "description": "GMC Yukon yoki Toyota Alphard avtomobilida qulay va tezkor transfer.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-14",
        "title": "Tezyurar Haramain poyezdi chiptasi (Makka - Madina)",
        "category": "transfer",
        "price": 900000,
        "description": "Zamonaviy poyezdda 2 soat 20 daqiqada qulay sayohat (Biznes/Ekonom).",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-15",
        "title": "Shaxsiy ellikboshi va gid hamrohligi xizmati",
        "category": "service",
        "price": 1800000,
        "description": "Ziyorat arkonlarini to‘liq o‘rgatuvchi va ibodatlarda yo‘lboshchilik qiluvchi mutaxassis.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-16",
        "title": "Haramda aravacha va ko‘makchi hamroh xizmati",
        "category": "assistance",
        "price": 1200000,
        "description": "Keksalar yoki harakatlanishi cheklangan ziyoratchilar uchun tavof va sa’yda shaxsiy ko‘mak.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-17",
        "title": "Tabarruk Zamzam suvi (5 litrlik qadoqda aeroportda)",
        "category": "essentials",
        "price": 150000,
        "description": "Saudiya davlati tomonidan ruxsat etilgan zavod qadog‘idagi asl Zamzam suvi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-18",
        "title": "Ziyoratchi to‘liq anjomlar to‘plami",
        "category": "essentials",
        "price": 450000,
        "description": "Ixrom matosi, kamar, chamadon, yelkama sumka, beydjik va duo kitoblari to‘plami.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-19",
        "title": "Tibbiy sug‘urta va shifokor nazorati xizmati",
        "category": "medical",
        "price": 350000,
        "description": "Safar davomida 24/7 guruh shifokori nazorati va xalqaro sug‘urta polisi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-20",
        "title": "Bolalar uchun Umra safariga maxsus chegirmali chipta",
        "category": "child_package",
        "price": 9800000,
        "description": "2 yoshdan 12 yoshgacha bo‘lgan bolalar uchun alohida o‘rin va dastur.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      },
      {
        "id": "umr-21",
        "title": "Taif shahriga bir kunlik tarixiy ekskursiya",
        "category": "excursion",
        "price": 950000,
        "description": "Taif masjidi, Addos bog‘i, teleferik va mashhur Taif atirgul moyi fabrikasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "pilgrim_full_name",
            "doc_number",
            "birth_date",
            "gender",
            "preferred_month",
            "room_sharing",
            "contact_phone"
          ],
          "properties": {
            "pilgrim_full_name": {
              "type": "string",
              "title": "Ziyoratchi to‘liq ismi (Pasportdagidek)"
            },
            "doc_number": {
              "type": "string",
              "title": "Xorijiy pasport yoki ID raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_month": {
              "type": "string",
              "enum": [
                "Shavvol",
                "Zulqa’da",
                "Ramazon",
                "Kuz oylari",
                "Qish mavsumi"
              ],
              "title": "Mo‘ljallangan safar oyi"
            },
            "room_sharing": {
              "type": "string",
              "enum": [
                "2 kishilik xona",
                "3 kishilik xona",
                "4 kishilik xona"
              ],
              "title": "Mehmonxona xonasi turi"
            },
            "has_mahram": {
              "type": "boolean",
              "title": "Ayol ziyoratchi uchun mahram bormi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Aloqa telefon raqami"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "rentcar-express",
    "name": "RentCar Express — Avtomobil Ijarasi va Prokat",
    "type": "BOOKINGS",
    "category": "auto_rental",
    "description": "Toshkent va viloyatlar bo‘ylab yangi avtomobillar ijarasi: depozitsiz, to‘liq KASKO sug‘urtasi bilan, aeroport va temir yo‘l vokzallariga bepul yetkazib berish.",
    "rating": 4.88,
    "phone": "+998781405050",
    "hours": "24/7",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "rc-loc-aeroport",
        "name": "RentCar Toshkent Xalqaro Aeroporti filiali",
        "address": "Toshkent sh., Qumariq ko‘chasi, Terminal 2 avtoturargohi",
        "lat": 41.258,
        "lng": 69.282,
        "radius": 40
      },
      {
        "id": "rc-loc-chilonzor",
        "name": "RentCar Chilonzor Markaziy Parki",
        "address": "Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi, 52-uy",
        "lat": 41.275,
        "lng": 69.205,
        "radius": 30
      }
    ],
    "offerings": [
      {
        "id": "rc-01",
        "title": "Chevrolet Onix Turbo 1.2 AT (Kunlik ijara)",
        "category": "sedan_economy",
        "price": 390000,
        "description": "Avtomat karobka, lyuk, kruiz-kontrol, konditsioner, benzin tejamkor.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-02",
        "title": "Chevrolet Cobalt 1.5 AT Style (Kunlik ijara)",
        "category": "sedan_economy",
        "price": 320000,
        "description": "Ishonchli shahar va viloyat qatnovlari uchun, avtomat karobka, toza salon.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-03",
        "title": "Chevrolet Lacetti Gentra 1.5 AT (Kunlik ijara)",
        "category": "sedan_economy",
        "price": 300000,
        "description": "Qulay shahar sedani, avtomat uzatma, to‘liq texnik nazoratdan o‘tgan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-04",
        "title": "Chevrolet Tracker 2 Premier Plus (Kunlik ijara)",
        "category": "crossover",
        "price": 550000,
        "description": "Panoramali tom, charm salon, 360 kamera, zamonaviy shahar krossoveri.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-05",
        "title": "Chevrolet Malibu 2 XL 2.0 Turbo (Kunlik ijara)",
        "category": "business_sedan",
        "price": 750000,
        "description": "Biznes klass sedani, qora rang, to‘liq qulaylik va yuqori dinamika.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-06",
        "title": "Chevrolet Traverse 3.6 AWD (Kunlik ijara)",
        "category": "suv_large",
        "price": 1200000,
        "description": "7 o‘rinli oilaviy premium yo‘ltanlamas, to‘liq privod, ulkan yukxona.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-07",
        "title": "Chevrolet Tahoe 5.3 V8 (Kunlik ijara)",
        "category": "suv_luxury",
        "price": 2100000,
        "description": "Hashamatli to‘liq o‘lchamli yo‘ltanlamas, nufuzli uchrashuvlar uchun ideal.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-08",
        "title": "BYD Song Plus Champion DM-i (Kunlik ijara)",
        "category": "hybrid_suv",
        "price": 650000,
        "description": "Gibrid krossover, 1100 km zaxira yurish masofasi, jim va tejamkor haydash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-09",
        "title": "BYD Chazor Plug-in Hybrid (Kunlik ijara)",
        "category": "hybrid_sedan",
        "price": 490000,
        "description": "Zamonaviy tejamkor sedan, yuqori darajadagi elektronika va qulaylik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-10",
        "title": "Kia K5 2.5 GT-Line (Kunlik ijara)",
        "category": "business_sedan",
        "price": 850000,
        "description": "Sportiv dizayn, qizil charm salon, panoramali lyuk, akustik tizim.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-11",
        "title": "Kia Sportage 2.0 AWD X-Line (Kunlik ijara)",
        "category": "crossover",
        "price": 790000,
        "description": "Universal qulay krossover, tog‘ va shahar safarlari uchun ayni muddao.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-12",
        "title": "Hyundai Sonata 2.5 AT (Kunlik ijara)",
        "category": "business_sedan",
        "price": 780000,
        "description": "Keng salon, yuqori darajadagi shovqinsizlantirish, kruiz nazorati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-13",
        "title": "Hyundai Santa Fe 2.5 AWD 7 o‘rinli (Kunlik ijara)",
        "category": "suv_large",
        "price": 1100000,
        "description": "Katta oila va tog‘ kurortlari uchun 7 o‘rinli mukammal avtomobil.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-14",
        "title": "Mercedes-Benz S-Class W222 (Shaxsiy haydovchi bilan 8 soat)",
        "category": "vip_chauffeur",
        "price": 2800000,
        "description": "VIP mehmonlarni kutib olish, delegatsiyalar va to‘y marosimlari uchun.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-15",
        "title": "Mercedes-Benz Sprinter 18 o‘rinli mikroavtobus (Kunlik)",
        "category": "minibus",
        "price": 1500000,
        "description": "Katta guruhlar va delegatsiyalar uchun qulay yumshoq o‘rindiqli mikroavtobus.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-16",
        "title": "Toyota Land Cruiser 300 V6 (Kunlik ijara)",
        "category": "suv_luxury",
        "price": 2600000,
        "description": "Afsonaviy nufuzli yo‘ltanlamas, eng yuqori darajadagi qulaylik va xavfsizlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-17",
        "title": "Chevrolet Damas Deluxe (Kunlik tijorat ijarasi)",
        "category": "commercial",
        "price": 220000,
        "description": "Yuk va shahar ichida mayda tovarlar tashish uchun qulay va ixcham.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-18",
        "title": "Bolalar avto-o‘rindig‘i (IsoFix xavfsizlik kreslosi)",
        "category": "accessory",
        "price": 50000,
        "description": "Chaqaloqlar va bolalar uchun xavfsiz sertifikatlangan o‘rindiq.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-19",
        "title": "GPS Navigator va cheksiz 4G Wi-Fi router (Kunlik)",
        "category": "accessory",
        "price": 40000,
        "description": "Salonda butun oila uchun doimiy tezkor internet va qulay navigatsiya.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-20",
        "title": "To‘liq KASKO Nol javobgarlik sug‘urtasi",
        "category": "insurance",
        "price": 95000,
        "description": "Har qanday mayda tirnalish va shikastlanishlarda moliyaviy xotirjamlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "rc-21",
        "title": "Avtomobilni manzilga / aeroportga yetkazib berish",
        "category": "delivery_service",
        "price": 70000,
        "description": "Toshkent shahri bo‘ylab istalgan manzilga toza holda topshirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "driver_full_name",
            "driver_license_number",
            "rental_days",
            "pickup_datetime",
            "delivery_location",
            "destination_region",
            "contact_phone"
          ],
          "properties": {
            "driver_full_name": {
              "type": "string",
              "title": "Haydovchi F.I.O"
            },
            "driver_license_number": {
              "type": "string",
              "title": "Haydovchilik guvohnomasi seriyasi va raqami"
            },
            "driver_age": {
              "type": "integer",
              "title": "Haydovchi yoshi"
            },
            "rental_days": {
              "type": "integer",
              "title": "Ijara kunlari soni"
            },
            "pickup_datetime": {
              "type": "string",
              "title": "Qabul qilish sanasi va vaqti"
            },
            "delivery_location": {
              "type": "string",
              "title": "Qabul qilish manzili (Aeroport, Vokzal, Ofis, Manzilga)"
            },
            "destination_region": {
              "type": "string",
              "enum": [
                "Faqat Toshkent shahri",
                "Toshkent viloyati / Tog‘ zonalari",
                "Viloyatlararo safar"
              ],
              "title": "Harakatlanish hududi"
            },
            "needs_child_seat": {
              "type": "boolean",
              "title": "Bolalar o‘rindig‘i kerakmi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "oqtepa-lavash",
    "name": "Oqtepa Lavash — Fast Food va Lavashlar",
    "type": "DELIVERY",
    "category": "food_dining",
    "description": "O‘zbekistonning sevimli tez tayyorlanadigan milliy fast-food tarmog‘i: mazali lavashlar, pita shaurma, pishloqli gamburgerlar va tovuqli stripslar.",
    "rating": 4.86,
    "phone": "+998781500030",
    "hours": "09:00 - 03:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "oq-loc-oqtepa",
        "name": "Oqtepa Lavash Bosh Filiali",
        "address": "Toshkent sh., Uchtepa tumani, Oqtepa maydoni",
        "lat": 41.298,
        "lng": 69.215,
        "radius": 10
      },
      {
        "id": "oq-loc-yunus",
        "name": "Oqtepa Lavash Yunusobod",
        "address": "Toshkent sh., Yunusobod tumani, 4-mavze",
        "lat": 41.358,
        "lng": 69.289,
        "radius": 10
      },
      {
        "id": "oq-loc-chilonzor",
        "name": "Oqtepa Lavash Chilonzor 9",
        "address": "Toshkent sh., Chilonzor tumani, 9-mavze",
        "lat": 41.272,
        "lng": 69.201,
        "radius": 10
      }
    ],
    "offerings": [
      {
        "id": "oq-01",
        "title": "Klassik Mol go‘shtli Lavash (Standart)",
        "category": "lavash",
        "price": 33000,
        "description": "Yupqa xamir, mayin mol go‘shti, qizarib pishgan pomidor, bodring, maxsus tomat va oq sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-02",
        "title": "Klassik Mol go‘shtli Lavash (Katta Big)",
        "category": "lavash",
        "price": 39000,
        "description": "Ko‘proq go‘sht va qarsildoq sabzavotlar bilan katta porsiyadagi to‘yimli lavash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-03",
        "title": "Pishloqli (Sirli) Mol go‘shtli Lavash",
        "category": "lavash",
        "price": 38000,
        "description": "Erib oquvchi Golland pishlog‘i va suvli mol go‘shti uyg‘unligi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-04",
        "title": "Tovuqli Lavash (Standart)",
        "category": "lavash",
        "price": 31000,
        "description": "Grilda marinovka qilib qovurilgan tovuq filesi, bodring, pomidor, oq sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-05",
        "title": "Tandir Lavash Mol go‘shtli",
        "category": "lavash",
        "price": 37000,
        "description": "Haqiqiy tandirda toblab pishirilgan qarsildoq maxsus xamirli lavash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-06",
        "title": "Shaurma Pita nonida Mol go‘shtli",
        "category": "shaurma",
        "price": 28000,
        "description": "Dumaloq arabcha pitada mol go‘shti va sabzavotlar.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-07",
        "title": "Shaurma Nonida Tovuqli",
        "category": "shaurma",
        "price": 26000,
        "description": "Issiq pita nonida mayin tovuq go‘shti va marinadlangan piyoz, sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-08",
        "title": "Doner Nonida Mol go‘shtli (Katta)",
        "category": "doner",
        "price": 32000,
        "description": "Yumshoq turkcha nonda suvli doner go‘shti, qizil karam va fri kartoshkasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-09",
        "title": "Klabb Sendvich kartoshka fri bilan",
        "category": "sandwich",
        "price": 36000,
        "description": "Tosterda qizartirilgan non, kurka go‘shti, pishloq, tuxum, pomidor va fri kartoshka.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-10",
        "title": "Gamburger Klassik mol go‘shtli",
        "category": "burgers",
        "price": 26000,
        "description": "Suvli kotlet, marinadlangan bodring, pomidor, marul barglari va sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-11",
        "title": "Chizburger mol go‘shtli erigan pishloq bilan",
        "category": "burgers",
        "price": 29000,
        "description": "Klassik kotlet, ikki qavat Chedder pishlog‘i, yumshoq kunjutli bulochka.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-12",
        "title": "Dabl Chizburger (2 qavatli kotlet)",
        "category": "burgers",
        "price": 39000,
        "description": "Ikki hissa mol go‘shti kotleti, mo‘l erigan pishloq va maxsus sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-13",
        "title": "Tovuq Stripslari (5 dona qarsildoq)",
        "category": "chicken",
        "price": 27000,
        "description": "Maxsus ziravorli panada tayyorlangan mayin tovuq filesi bo‘laklari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-14",
        "title": "Tovuq Qanotchalari Achchiq Hot (6 dona)",
        "category": "chicken",
        "price": 32000,
        "description": "Karsillagan achchiq qovurilgan tovuq qanotlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-15",
        "title": "Kartoshka Fri (Standart)",
        "category": "fries",
        "price": 16000,
        "description": "Tillarang qarsildoq qovurilgan kartoshka somonchalari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-16",
        "title": "Qishloqcha Kartoshka (Derevenskiy)",
        "category": "fries",
        "price": 18000,
        "description": "Xushbo‘y o‘tlar va sarimsoq bilan qobig‘ida qovurilgan kartoshka bo‘laklari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-17",
        "title": "Pishloqli Koptokchalar (Mozzarella balls 6 dona)",
        "category": "snacks",
        "price": 24000,
        "description": "Ichida cho‘ziluvchan Mozzarella pishlog‘i bo‘lgan qarsildoq gazak.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-18",
        "title": "Pishloqli Maxsus Sous Oqtepa",
        "category": "sauces",
        "price": 5000,
        "description": "Kremsimon boy ta’mli Chedder pishloqli sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-19",
        "title": "Sarimsoqli Oq sous (Chesnochniy)",
        "category": "sauces",
        "price": 5000,
        "description": "Klassik sarimsoq va ko‘katli mayin oq sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-20",
        "title": "Coca-Cola Classic 0.5L muzdek",
        "category": "beverages",
        "price": 11000,
        "description": "Muzdek gazlangan tetiklantiruvchi ichimlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      },
      {
        "id": "oq-21",
        "title": "Oqtepa Milliy Muzdek Ayron 0.4L",
        "category": "beverages",
        "price": 8000,
        "description": "Yalpiz va bodringli tetiklantiruvchi milliy sutli ichimlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_number": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "spice_level": {
              "type": "string",
              "enum": [
                "Oddiy (achchiqsiz)",
                "O‘rtacha achchiq",
                "Achchiq Hot"
              ],
              "title": "Achchiqlik darajasi"
            },
            "cut_lavash": {
              "type": "boolean",
              "title": "Lavashni 2 ga bo‘lib qadoqlash"
            },
            "cutlery_count": {
              "type": "integer",
              "title": "Bir martalik anjomlar soni"
            },
            "contact_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            },
            "notes": {
              "type": "string",
              "title": "Kuryerga qo‘shimcha eslatma"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "feedup",
    "name": "FeedUp — Qarsildoq Tovuq va Burgerlar",
    "type": "DELIVERY",
    "category": "food_dining",
    "description": "Karsillagan qovurilgan tovuqlar, mualliflik stripslari, mazali souslar, burgerlar va butun oila uchun mo‘ljallangan to‘yimli boks kombolar.",
    "rating": 4.83,
    "phone": "+998712002211",
    "hours": "10:00 - 02:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "fu-loc-qatortol",
        "name": "FeedUp Qatortol filiali",
        "address": "Toshkent sh., Chilonzor tumani, Qatortol ko‘chasi, 28-uy",
        "lat": 41.288,
        "lng": 69.214,
        "radius": 10
      },
      {
        "id": "fu-loc-sergeli",
        "name": "FeedUp Sergeli filiali",
        "address": "Toshkent sh., Sergeli tumani, Yangi Sergeli ko‘chasi",
        "lat": 41.226,
        "lng": 69.221,
        "radius": 10
      },
      {
        "id": "fu-loc-beruniy",
        "name": "FeedUp Beruniy filiali",
        "address": "Toshkent sh., Olmazor tumani, Beruniy shoh ko‘chasi",
        "lat": 41.344,
        "lng": 69.208,
        "radius": 10
      }
    ],
    "offerings": [
      {
        "id": "fu-01",
        "title": "FeedUp Strips Qarsildoq (3 dona)",
        "category": "chicken",
        "price": 22000,
        "description": "Original retsept asosida tayyorlangan yumshoq tovuq filesi stripslari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-02",
        "title": "FeedUp Strips Qarsildoq (6 dona)",
        "category": "chicken",
        "price": 39000,
        "description": "Katta porsiyadagi mayin tovuq go‘shti stripslari, sous bilan.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-03",
        "title": "FeedUp Achchiq Qanotlar Hot Wings (6 dona)",
        "category": "chicken",
        "price": 34000,
        "description": "Maxsus o‘tkir panada qovurilgan karsillagan achchiq tovuq qanotlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-04",
        "title": "FeedUp Achchiq Qanotlar Hot Wings (12 dona)",
        "category": "chicken",
        "price": 62000,
        "description": "Do‘stlar davrasi uchun katta porsiyadagi o‘tkir achchiq tovuq qanotlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-05",
        "title": "FeedUp Tovuq Oyoqchalari (Drumsticks 3 dona)",
        "category": "chicken",
        "price": 36000,
        "description": "Tillarang qarsildoq qobig‘i ostidagi suvli tovuq oyoqchalari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-06",
        "title": "Big Feed Burger Tovuqli",
        "category": "burgers",
        "price": 32000,
        "description": "Qarsildoq tovuq stripslari, aysberg salat bargi, pomidor va maxsus oq sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-07",
        "title": "Feed Chizburger Strips bilan",
        "category": "burgers",
        "price": 35000,
        "description": "Tovuq stripslari, qovurilgan Chedder pishlog‘i, tuzlangan bodring va sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-08",
        "title": "Barbeque Burger Mol go‘shtli",
        "category": "burgers",
        "price": 37000,
        "description": "Suvli mol go‘shti kotleti, qovurilgan piyoz, dudlangan BBQ sous va salat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-09",
        "title": "Tvister Roll Tovuqli (Standart)",
        "category": "rolls",
        "price": 29000,
        "description": "Yupqa tortilyaga o‘ralgan issiq strips, pomidor, salat va sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-10",
        "title": "Tvister Roll Pishloqli (Cheese Twist)",
        "category": "rolls",
        "price": 33000,
        "description": "Eritilgan Chedder pishlog‘i va stripslar bilan boyitilgan tvister.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-11",
        "title": "Mega Boks Kombo (Yakka o‘zi uchun to‘yimli)",
        "category": "combos",
        "price": 52000,
        "description": "Big Feed burger, 2 dona strips, o‘rtacha fri va Coca-Cola 0.5L.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-12",
        "title": "Do‘stlar Katta Boksi (3-4 kishilik)",
        "category": "combos",
        "price": 115000,
        "description": "12 dona qanotcha, 6 dona strips, 2 ta katta fri va 2 ta Coca-Cola 0.5L.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-13",
        "title": "Feed Tovuq Naggetslari (6 dona)",
        "category": "snacks",
        "price": 20000,
        "description": "Bolalar sevimli mayin qovurilgan tovuq naggetslari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-14",
        "title": "Feed Tovuq Naggetslari (9 dona)",
        "category": "snacks",
        "price": 28000,
        "description": "Katta porsiyadagi qarsildoq tovuq naggetslari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-15",
        "title": "Kartoshka Fri (Katta porsiya)",
        "category": "fries",
        "price": 19000,
        "description": "Maxsus sifatli kartoshkadan qovurilgan qarsildoq fri.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-16",
        "title": "Pishloqli Mozzarella tayoqchalari (4 dona)",
        "category": "snacks",
        "price": 22000,
        "description": "Cho‘ziluvchan pishloq va qarsildoq panirka.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-17",
        "title": "Tsezar Salati Qarsildoq Tovuq bilan",
        "category": "salads",
        "price": 29000,
        "description": "Aysberg barglari, cherri pomidori, suxariki, Parmezan va Tsezar sousi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-18",
        "title": "Sweet Chili Sousi (Shirin-achchiq)",
        "category": "sauces",
        "price": 5000,
        "description": "Tovuq stripslari bilan ajoyib mos tushuvchi osiyocha shirin-achchiq sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-19",
        "title": "Barbeque Dudlangan Sous",
        "category": "sauces",
        "price": 5000,
        "description": "Dudlangan qalin klassik Amerika BBQ sousi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-20",
        "title": "Pishloqli Chedder Sousi",
        "category": "sauces",
        "price": 5000,
        "description": "Qaymoqli boy pishloq ta’miga ega sous.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "fu-21",
        "title": "Fanta Orange 0.5L muzdek",
        "category": "beverages",
        "price": 11000,
        "description": "Yorqin apelsin ta’miga ega salqin ichimlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "customer_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "apartment_or_office": {
              "type": "string",
              "title": "Xonadon / ofis raqami"
            },
            "sauce_selection": {
              "type": "string",
              "enum": [
                "Pishloqli sous",
                "Barbeque sous",
                "Sweet Chili sous",
                "Sarimsoqli sous"
              ],
              "title": "Qo‘shimcha sous tanlovi"
            },
            "call_beforehand": {
              "type": "boolean",
              "title": "Yetib kelganda oldindan qo‘ng‘iroq qilish"
            },
            "contactless_delivery": {
              "type": "boolean",
              "title": "Eshik oldida qoldirish (kontaktsiz yetkazish)"
            },
            "customer_phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "derma-care",
    "name": "DermaCare — Kosmetologiya va Estetik Dermatologiya",
    "type": "SERVICES",
    "category": "medical_health",
    "description": "Zamonaviy dermatologiya, tibbiy kosmetologiya, teri muammolarini davolash, lazer epilatsiyasi va yuz parvarishi bo‘yicha professional klinika.",
    "rating": 4.93,
    "phone": "+998712053344",
    "hours": "09:00 - 20:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "dc-loc-shota",
        "name": "DermaCare Markaziy Klinikasi",
        "address": "Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko‘chasi, 65-uy",
        "lat": 41.282,
        "lng": 69.251,
        "radius": 25
      },
      {
        "id": "dc-loc-afrosiyob",
        "name": "DermaCare Mirobod filiali",
        "address": "Toshkent sh., Mirobod tumani, Afrosiyob ko‘chasi, 12-uy",
        "lat": 41.302,
        "lng": 69.268,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "dc-01",
        "title": "Dermatolog-shifokor birlamchi konsultatsiyasi va ko‘rigi",
        "category": "consultation",
        "price": 180000,
        "description": "Teri, soch va tirnoq muammolarini aniqlash, individual davolash rejasini tuzish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-02",
        "title": "Raqamli Dermatoskopiya (Xol va pigment dog‘larni tekshirish)",
        "category": "diagnostic",
        "price": 220000,
        "description": "Optik dermatoskop yordamida teri yangi hosilalarini xavfsizligini aniqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-03",
        "title": "Yuz terisini apparatli chuqur tozalash (HydraFacial)",
        "category": "facial_care",
        "price": 450000,
        "description": "Gidropiling, chuqur vakuumli tozalash, gialuron zardobi bilan oziqlantirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-04",
        "title": "Karbonli Lazer Pilingi (Qora qo‘g‘irchoq muolajasi)",
        "category": "laser",
        "price": 380000,
        "description": "Karbon nano-geli va lazer nuri yordamida g‘ovaklarni toraytirish va terini yoshartirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-05",
        "title": "Akne va husnbuzarlarni kompleks davolash kursi (1 seans)",
        "category": "acne_treatment",
        "price": 320000,
        "description": "Yallig‘lanishga qarshi dorivor tozalash va fototerapiya.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-06",
        "title": "Yuz terisi biorevitalizatsiyasi (Gialuron kislotasi)",
        "category": "injection",
        "price": 850000,
        "description": "Fransiya/Italiya preparatlari bilan terining chuqur namlanishi va elastikligi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-07",
        "title": "Plazmolifting (PRP Terapiya yuz uchun)",
        "category": "injection",
        "price": 600000,
        "description": "Mijozning o‘z qonidan ajratilgan trombotsitlarga boy plazma bilan yoshartirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-08",
        "title": "Botulotoksin muolajasi (Peshana va ko‘z atrofi ajinlari)",
        "category": "injection",
        "price": 750000,
        "description": "Mimik ajinlarni bartaraf qilish, sertifikatlangan Botoks preparati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-09",
        "title": "Lab shaklini tabiiy korreksiya qilish (Gialuron fileri 1ml)",
        "category": "contour",
        "price": 1300000,
        "description": "Lab hajmini tabiiy oshirish va simmetriyasini to‘g‘rilash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-10",
        "title": "Yuz terisi mezoterapiyasi (Vitaminli kokteyl)",
        "category": "injection",
        "price": 480000,
        "description": "Vitaminlar, peptidlar va minerallar majmuasi bilan terini jonlantirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-11",
        "title": "Lazer epilatsiyasi Aleksandrit (Butun vujud Total paket)",
        "category": "epilation",
        "price": 850000,
        "description": "Candela GentleLase apparatida og‘riqsiz va samarali tuklardan tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-12",
        "title": "Lazer epilatsiyasi (Oyoqlar to‘liq + Qo‘ltiq osti)",
        "category": "epilation",
        "price": 420000,
        "description": "Yozgi mavsum oldidan silliq teri uchun qulay paket.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-13",
        "title": "Lazer epilatsiyasi (Chuqur bikini zonasi)",
        "category": "epilation",
        "price": 220000,
        "description": "Maxsus nozik teri uchun sovutish tizimli apparatda muolaja.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-14",
        "title": "Postakne va chandiqlarni fraksion CO2 lazerda silliqlash",
        "category": "laser",
        "price": 700000,
        "description": "Chuqur izlar va chandiqlarni terining yangilanishi orqali tekislash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-15",
        "title": "Yuz terisini ultratovushli tozalash (Ultrasonic Peeling)",
        "category": "facial_care",
        "price": 250000,
        "description": "O‘lik teri hujayralarini yumshoq ko‘chirish va tozalash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-16",
        "title": "Pigment dog‘lar va sepkillarni fototerapiyada yo‘qotish (IPL)",
        "category": "laser",
        "price": 400000,
        "description": "Nur impulslari yordamida giperpigmentatsiyani samarali oqartirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-17",
        "title": "RF-Lifting (Radiochastotali terini taranglashtirish)",
        "category": "lifting",
        "price": 390000,
        "description": "Kollagen ishlab chiqarilishini rag‘batlantirish va ikkinchi iyakni yo‘qotish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-18",
        "title": "Yuzning plastik va limfodrenaj massaji (60 daqiqa)",
        "category": "massage",
        "price": 240000,
        "description": "Shishlarni yo‘qotish, qon aylanishini yaxshilash va yuz ovalini ko‘tarish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-19",
        "title": "Ko‘z osti qora halqalari va shishlarni mezoterapiyasi",
        "category": "injection",
        "price": 350000,
        "description": "Ko‘z atrofi charchoqligini yo‘qotuvchi maxsus drenaj zardobi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-20",
        "title": "Bosh terisi trixologik davolash (Soch to‘kilishiga qarshi PRP)",
        "category": "hair_care",
        "price": 550000,
        "description": "Soch follikulalarini mustahkamlash va yangi soch o‘sishini faollashtirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      },
      {
        "id": "dc-21",
        "title": "Glikol va bodom kislotali yengil kimyoviy piling",
        "category": "peeling",
        "price": 280000,
        "description": "Terining rangini bir xillashtirish va mayin porlash berish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "patient_name",
            "preferred_date",
            "time_slot",
            "preferred_branch",
            "phone"
          ],
          "properties": {
            "patient_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi"
            },
            "birth_year": {
              "type": "integer",
              "title": "Tug‘ilgan yili"
            },
            "preferred_date": {
              "type": "string",
              "title": "Qabul sanasi (YYYY-MM-DD)"
            },
            "time_slot": {
              "type": "string",
              "enum": [
                "10:00 - 12:00",
                "13:00 - 15:00",
                "16:00 - 18:00",
                "18:00 - 20:00"
              ],
              "title": "Ma’qul vaqt oralig‘i"
            },
            "skin_concerns": {
              "type": "string",
              "title": "Asosiy shikoyat (akne, sepkil, ajin, tuklar)"
            },
            "has_allergies": {
              "type": "boolean",
              "title": "Kosmetik vosita yoki dorilarga allergiya bormi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Shota Rustaveli klinikasi",
                "Mirobod filiali"
              ],
              "title": "Klinika filiali"
            },
            "phone": {
              "type": "string",
              "title": "Bog‘lanish telefon raqami"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "smart-gadget",
    "name": "SmartGadget — Smartfonlar va Elektronika Do‘koni",
    "type": "RETAIL",
    "category": "retail_electronics",
    "description": "Asl smartfonlar, planshetlar, noutbuklar, aqlli soatlar va maishiy texnika gadjetlari rasmiy kafolat bilan. Toshkent bo‘ylab 2 soatda yetkazib berish.",
    "rating": 4.89,
    "phone": "+998781291122",
    "hours": "09:00 - 21:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "sg-loc-malika",
        "name": "SmartGadget Malika Markazi",
        "address": "Toshkent sh., Shayxontohur tumani, Malika A-24 do‘koni",
        "lat": 41.341,
        "lng": 69.263,
        "radius": 25
      },
      {
        "id": "sg-loc-sahiy",
        "name": "SmartGadget Abu Sahiy filiali",
        "address": "Toshkent sh., Chilonzor tumani, Abu Sahiy savdo majmuasi",
        "lat": 41.248,
        "lng": 69.167,
        "radius": 25
      }
    ],
    "offerings": [
      {
        "id": "sg-01",
        "title": "Apple iPhone 15 Pro 128GB Natural Titanium",
        "category": "smartphones",
        "price": 13200000,
        "description": "Titan korpus, A17 Pro chipi, 48MP kamera tizimi, 1 yillik rasmiy Apple kafolati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-02",
        "title": "Apple iPhone 15 128GB Black (Dual SIM)",
        "category": "smartphones",
        "price": 9800000,
        "description": "Dynamic Island, 48MP asosiy kamera, USB-C porti va ajoyib avtonomlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-03",
        "title": "Samsung Galaxy S24 Ultra 256GB Titanium Gray",
        "category": "smartphones",
        "price": 13800000,
        "description": "Galaxy AI sun’iy intellekt xususiyatlari, 200MP kamera, S-Pen ruchkasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-04",
        "title": "Xiaomi 14 Ultra 512GB Leica Photography Kit bilan",
        "category": "smartphones",
        "price": 12500000,
        "description": "Leica professional 1 dyuymli linzalari, Snapdragon 8 Gen 3, tezkor 90W zaryad.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-05",
        "title": "Apple MacBook Air 13-inch M3 8GB/256GB Space Gray",
        "category": "laptops",
        "price": 13500000,
        "description": "M3 superchipli noutbuk, 18 soat batareya quvvati, yengil va shovqinsiz fan-less korpus.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-06",
        "title": "Apple iPad Air 11-inch M2 128GB Wi-Fi Starlight",
        "category": "tablets",
        "price": 8400000,
        "description": "M2 protsessorli planshet, Liquid Retina displey, Apple Pencil Pro qo‘llab-quvvatlaydi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-07",
        "title": "Apple AirPods Pro 2 (MagSafe USB-C keys bilan)",
        "category": "audio",
        "price": 2700000,
        "description": "Faol shovqin so‘ndirish (ANC), shaffoflik rejimi, fazoviy audio va USB-C.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-08",
        "title": "Apple Watch Series 9 45mm GPS Midnight Alyuminiy",
        "category": "wearables",
        "price": 4600000,
        "description": "Double tap imo-ishorasi, yorqin 2000 nit displey, puls va EKG datchiklari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-09",
        "title": "Samsung Galaxy Watch 6 Classic 47mm Black",
        "category": "wearables",
        "price": 3800000,
        "description": "Aylanuvchi mexanik bezel, qon bosimi va EKG o‘lchash, safir shisha.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-10",
        "title": "Xiaomi Robot Vacuum X10+ avtomatik tozalash stansiyali",
        "category": "smart_home",
        "price": 6900000,
        "description": "Namlab va quruq tozalovchi robot-changyutgich, avtomat suv to‘ldirish va lattani yuvish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-11",
        "title": "Dyson Supersonic fen (Special Gift Edition qutida)",
        "category": "beauty_gadgets",
        "price": 5600000,
        "description": "Aqlli harorat nazorati, sochni kuydirmasdan tez qurituvchi 5 xil magnit uchlik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-12",
        "title": "Marshall Stanmore III Bluetooth simsiz akustik kalonkasi",
        "category": "audio",
        "price": 4400000,
        "description": "Afsonaviy Marshall rok-dizayni, chuqur baslar va xonani to‘ldiruvchi kuchli ovoz.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-13",
        "title": "Sony WH-1000XM5 shovqinni so‘ndiruvchi simsiz quloqchin",
        "category": "audio",
        "price": 4100000,
        "description": "Dunyodagi eng ilg‘or faol shovqin so‘ndirish (Noise Cancelling), 30 soat batareya.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-14",
        "title": "Anker 737 PowerBank 24000mAh (PowerCore 140W)",
        "category": "power",
        "price": 1250000,
        "description": "Noutbuk va telefonlarni bir vaqtda o‘ta tez quvvatlovchi aqlli ekranli powerbank.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-15",
        "title": "Baseus GaN5 Pro 100W tezkor zaryadlash adapteri",
        "category": "chargers",
        "price": 420000,
        "description": "Kompakt GaN texnologiyali adapter, noutbuk, planshet va smartfon uchun universal.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-16",
        "title": "Apple MagSafe zaryadlovchi magnit kabeli 1m (Asl)",
        "category": "accessories",
        "price": 490000,
        "description": "iPhone 12-15 seriyalari uchun 15W tezkor magnit simsiz quvvatlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-17",
        "title": "Ugreen USB-C to Lightning kabel MFi sertifikatlangan 1.5m",
        "category": "cables",
        "price": 140000,
        "description": "To‘qilgan bardoshli sim, iPhone tezkor quvvatlash va kompyuterga ma’lumot uzatish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-18",
        "title": "Belkin avtomobil ventilyatsiyasiga MagSafe ushlagichi",
        "category": "accessories",
        "price": 380000,
        "description": "Kuchli magnitli xavfsiz telefon ushlagichi, 360 daraja burilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-19",
        "title": "SanDisk Extreme 1TB Portable SSD tashqi disk",
        "category": "storage",
        "price": 1350000,
        "description": "Zarbalarga va suvga chidamli tezkor USB-C tashqi disk, video va fayllar uchun.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-20",
        "title": "Logitech MX Master 3S simsiz professional sichqoncha",
        "category": "peripherals",
        "price": 1150000,
        "description": "Shovqinsiz klavishlar, elektromagnetik MagSpeed aylanmasi, 8K DPI datchik.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      },
      {
        "id": "sg-21",
        "title": "Mijia Smart LED stol chirog‘i 1S (Wi-Fi va Apple HomeKit)",
        "category": "smart_home",
        "price": 360000,
        "description": "Ko‘zni charchatmaydigan yorug‘lik, yorqinlik va haroratni mobil ilovada boshqarish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "delivery_address",
            "recipient_name",
            "contact_phone"
          ],
          "properties": {
            "delivery_address": {
              "type": "string",
              "title": "Yetkazib berish manzili"
            },
            "recipient_name": {
              "type": "string",
              "title": "Qabul qiluvchi to‘liq ismi"
            },
            "contact_phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "preferred_color": {
              "type": "string",
              "title": "Mahsulot rangi (masalan Qora, Oq, Titan)"
            },
            "warranty_full_name": {
              "type": "string",
              "title": "Kafolat taloniga yoziladigan ism-familiya"
            },
            "tax_code_for_imei": {
              "type": "string",
              "title": "IMEI ro‘yxatdan o‘tkazish uchun soliq/ro‘yxat kodi"
            },
            "express_courier": {
              "type": "boolean",
              "title": "2 soat ichida yetkazib berish kerakmi"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "notarius-express",
    "name": "Notarius Express — Notarius va Rasmiy Tarjima",
    "type": "SERVICES",
    "category": "legal_services",
    "description": "Hujjatlarni notarial tasdiqlash, apostil qo‘yish, konsullik legalizatsiyasi va 35 dan ortiq xorijiy tillarga professional tarjima xizmati.",
    "rating": 4.97,
    "phone": "+998712031010",
    "hours": "09:00 - 18:00 (Dush-Shanba)",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "not-loc-adliya",
        "name": "Notarius va Tarjima Markaziy Ofisi",
        "address": "Toshkent sh., Mirzo Ulug‘bek tumani, Mustaqillik shoh ko‘chasi, 82-uy",
        "lat": 41.325,
        "lng": 69.308,
        "radius": 25
      },
      {
        "id": "not-loc-chilonzor",
        "name": "Notarius Chilonzor filiali",
        "address": "Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi, 23-uy",
        "lat": 41.286,
        "lng": 69.215,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "not-01",
        "title": "Pasport nusxasini notarial tasdiqlash (Kopiya verna)",
        "category": "notary",
        "price": 45000,
        "description": "O‘zbekiston yoki xorijiy pasport nusxasini qonuniy asl nusxaga tenglashtirib tasdiqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-02",
        "title": "Tug‘ilganlik haqida guvohnomani tarjima va notarial tasdiqlash",
        "category": "translation_notary",
        "price": 140000,
        "description": "Rus, ingliz yoki boshqa tillarga tarjima qilib, notarius muhri bilan muhrlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-03",
        "title": "Nikoh tuzilganligi haqida guvohnoma tarjimasi va tasdiqlash",
        "category": "translation_notary",
        "price": 140000,
        "description": "Xorijga chiqish yoki viza markazlariga topshirish uchun rasmiy tasdiqlangan hujjat.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-04",
        "title": "Diplom va baholar ilovasini ingliz tiliga rasmiy tarjima qilish",
        "category": "educational",
        "price": 240000,
        "description": "Xorijiy universitetlar (AQSh, Buyuk Britaniya, Yevropa) uchun rasmiy ilmiy tarjima.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-05",
        "title": "Diplom va ilovasini nemis tiliga tarjima va notarial tasdiqlash",
        "category": "educational",
        "price": 260000,
        "description": "Germaniya va Avstriya elchixonalari va oliy o‘quv yurtlari talablariga muvofiq.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-06",
        "title": "Ish joyidan ma’lumotnoma va daromadlar ma’lumotnomasini tarjima qilish",
        "category": "visa_docs",
        "price": 90000,
        "description": "Elchixonalar uchun bank ko‘chirmasi va oylik maosh ma’lumotnomasini tarjimasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-07",
        "title": "Sudlanganlik yo‘qligi to‘g‘risida ma’lumotnomaga Apostil qo‘yish",
        "category": "apostille",
        "price": 280000,
        "description": "Gaaga konvensiyasiga a’zo 120 dan ortiq davlatlar uchun rasmiy Apostil shtampi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-08",
        "title": "Ta’lim hujjatlariga (Diplom, attestat) Apostil qo‘yish",
        "category": "apostille",
        "price": 380000,
        "description": "Oliy va o‘rta maxsus ta’lim vazirligi orqali diplomning haqiqiyligini tasdiqlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-09",
        "title": "FHDYo (ZAGS) guvohnomalariga rasmiy Apostil qo‘yish",
        "category": "apostille",
        "price": 280000,
        "description": "Tug‘ilganlik, nikoh yoki ajrashganlik guvohnomalariga qonuniy shtamp bosish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-10",
        "title": "Avtotransportni boshqarish uchun ishonchnoma (General doverennost)",
        "category": "power_of_attorney",
        "price": 180000,
        "description": "Avtomobilni tasarruf etish, haydash yoki sotish huquqi bilan notarial ishonchnoma.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-11",
        "title": "Mol-mulk va ko‘chmas mulkni sotish / boshqarish ishonchnomasi",
        "category": "power_of_attorney",
        "price": 220000,
        "description": "Xonadon yoki yer uchastkasini boshqarish bo‘yicha vakolat berish hujjati.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-12",
        "title": "Voyaga yetmagan farzandni chet elga olib chiqish rozilik xati",
        "category": "consent_letter",
        "price": 160000,
        "description": "Chegara xizmatlari va elchixonalar talab qiladigan rasmiy notarial rozilik arizasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-13",
        "title": "Turar joy va kvartirani ijaraga berish shartnomasini notarial tasdiqlash",
        "category": "contracts",
        "price": 250000,
        "description": "Ijara shartnomasini soliq organlari va qonunchilik talablari asosida tuzish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-14",
        "title": "Qarz shartnomasi va tilxatni notarial tasdiqlash",
        "category": "contracts",
        "price": 290000,
        "description": "Fuqarolar o‘rtasidagi qarz munosabatlarini sud talablariga muvofiq qonuniy mustahkamlash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-15",
        "title": "Kompaniya Nizomi va Ta’sis hujjatlarini chet tiliga tarjima qilish",
        "category": "corporate",
        "price": 65000,
        "description": "Yuridik atamalarga qat’iy rioya qilgan holda professional iqtisodiy tarjima.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-16",
        "title": "Arab tiliga hujjatlar tarjimasi va elchixonalarga legalizatsiya",
        "category": "legalization",
        "price": 450000,
        "description": "BAA, Saudiya Arabistoni, Qatar elchixonalari uchun TIV va Adliya orqali to‘liq legalizatsiya.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-17",
        "title": "Xitoy tiliga rasmiy tarjima va Xitoy elchixonasi konsullik tasdig‘i",
        "category": "legalization",
        "price": 520000,
        "description": "Xitoy Xalq Respublikasida amalda bo‘lishi uchun konsullik legalizatsiyasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-18",
        "title": "Koreys tiliga hujjatlar tarjimasi va notarial tasdiqlash",
        "category": "translation_notary",
        "price": 180000,
        "description": "Janubiy Koreyada o‘qish yoki ishlash vizasi uchun to‘liq hujjatlar paketi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-19",
        "title": "Ekspress 2 soatlik shoshilinch tarjima va tasdiqlash xizmati",
        "category": "urgent_service",
        "price": 150000,
        "description": "Viza suhbati yoki uchrashuv oldidan eng tezkor tartibda bajarish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-20",
        "title": "Hujjatlarni kuryer orqali qabul qilib, tayyorini manzilga yetkazib berish",
        "category": "courier_service",
        "price": 50000,
        "description": "Toshkent shahri bo‘ylab hujjatlarni uydan chiqmasdan topshirish va qabul qilish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      },
      {
        "id": "not-21",
        "title": "Merosga bo‘lgan huquq to‘g‘risida guvohnoma konsultatsiyasi",
        "category": "notary",
        "price": 200000,
        "description": "Vasiyatnoma yoki qonun bo‘yicha merosni qabul qilish tartibi bo‘yicha yordam.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "client_name",
            "document_type",
            "source_lang",
            "target_lang",
            "phone"
          ],
          "properties": {
            "client_name": {
              "type": "string",
              "title": "Mijoz to‘liq ismi (F.I.O)"
            },
            "document_type": {
              "type": "string",
              "title": "Hujjat turi (Pasport, Diplom, Guvohnoma, Ishonchnoma)"
            },
            "source_lang": {
              "type": "string",
              "enum": [
                "O‘zbek tili",
                "Rus tili",
                "Ingliz tili",
                "Boshqa til"
              ],
              "title": "Hujjatning asl tili"
            },
            "target_lang": {
              "type": "string",
              "enum": [
                "Ingliz tili",
                "Rus tili",
                "Nemis tili",
                "Arab tili",
                "Turk tili",
                "Koreys tili",
                "Xitoy tili"
              ],
              "title": "Qaysi tilga tarjima qilinadi"
            },
            "needs_apostille": {
              "type": "boolean",
              "title": "Apostil shtampi kerakmi"
            },
            "needs_notarization": {
              "type": "boolean",
              "title": "Notarius muhri kerakmi"
            },
            "urgency": {
              "type": "string",
              "enum": [
                "Standart (24 soat)",
                "Ekspress (bugun 2-3 soatda)"
              ],
              "title": "Tayyorlash tezligi"
            },
            "delivery_address": {
              "type": "string",
              "title": "Tayyor hujjatni yetkazish manzili yoki Ofisdan olib ketish"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            }
          }
        }
      }
    ]
  },
  {
    "slug": "fitness-hub",
    "name": "Fitness Hub — Sport Zali, Basseyn va Trenajyor",
    "type": "SERVICES",
    "category": "sports_fitness",
    "description": "Zamonaviy trenajyor zali, 25 metrlik olimpiya suzish havzasi, fin saunasi, guruh mashg‘ulotlari va individual professional murabbiylar.",
    "rating": 4.91,
    "phone": "+998712078080",
    "hours": "06:30 - 23:00",
    "baseUrl": "https://evos-sandbox.shopla.uz",
    "locations": [
      {
        "id": "fh-loc-nukus",
        "name": "Fitness Hub Nukus Markazi",
        "address": "Toshkent sh., Mirobod tumani, Nukus ko‘chasi, 40-uy",
        "lat": 41.294,
        "lng": 69.276,
        "radius": 20
      },
      {
        "id": "fh-loc-navoiy",
        "name": "Fitness Hub Navoiy filiali",
        "address": "Toshkent sh., Shayxontohur tumani, Navoiy shoh ko‘chasi, 18-uy",
        "lat": 41.324,
        "lng": 69.248,
        "radius": 20
      }
    ],
    "offerings": [
      {
        "id": "fh-01",
        "title": "1 oylik zal abonenti Kunduzgi (07:00 - 17:00)",
        "category": "membership",
        "price": 450000,
        "description": "Trenajyor zali, kardiomashinalar va dushdan kunduzgi qulay vaqtda cheksiz foydalanish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-02",
        "title": "1 oylik To‘liq zal abonenti (Kun bo‘yi 06:30 - 23:00)",
        "category": "membership",
        "price": 650000,
        "description": "Cheksiz tashrif, trenajyor zali, krossfit zonasi va sauna.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-03",
        "title": "3 oylik Cheksiz abonent (+15 kun muzlatish huquqi bilan)",
        "category": "membership",
        "price": 1650000,
        "description": "Barcha zonalarga kirish, dastlabki InBody tahlili va shaxsiy shkafcha.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-04",
        "title": "6 oylik VIP Abonent (+30 kun muzlatish bilan)",
        "category": "membership",
        "price": 2900000,
        "description": "Cheksiz trenajyor, basseyn, fin saunasi va 2 ta bepul murabbiy mashg‘uloti.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-05",
        "title": "1 yillik Platinum VIP Abonent (To‘liq cheksiz barcha zonalar)",
        "category": "membership",
        "price": 5200000,
        "description": "Yil davomida cheksiz fitness, basseyn, xamom, 60 kun muzlatish va mehmon taklifnomalari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-06",
        "title": "Suzish havzasi (Basseyn) uchun 1 oylik abonent (12 ta kirish)",
        "category": "swimming",
        "price": 550000,
        "description": "25 metrlik zamonaviy tozalash tizimiga ega olimpiya suzish havzasi va sauna.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-07",
        "title": "Suzish bo‘yicha 1 oylik cheksiz abonent",
        "category": "swimming",
        "price": 750000,
        "description": "Har kuni xohlagan vaqtda basseyn va gidromassaj zonasidan foydalanish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-08",
        "title": "Shaxsiy professional murabbiy bilan 10 ta individual mashg‘ulot",
        "category": "personal_training",
        "price": 1200000,
        "description": "Vazn tashlash yoki mushak o‘stirish bo‘yicha qat’iy nazorat va to‘g‘ri texnika.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-09",
        "title": "Shaxsiy murabbiy bilan 20 ta individual mashg‘ulot kursi",
        "category": "personal_training",
        "price": 2100000,
        "description": "To‘liq transformatsiya kursi, haftalik natijalar monitoringi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-10",
        "title": "Bolalar uchun suzish bo‘yicha guruh mashg‘ulotlari (oylik 12 dars)",
        "category": "kids_sports",
        "price": 490000,
        "description": "Tajribali murabbiy nazorati ostida noldan suzishni o‘rganish va chiniqish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-11",
        "title": "Ayollar uchun guruhli Pilates va Stretching mashg‘ulotlari",
        "category": "group_classes",
        "price": 480000,
        "description": "Qaddi-qomatni to‘g‘rilash, egiluvchanlikni oshirish va bel og‘riqlaridan xalos bo‘lish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-12",
        "title": "Guruhli Yoga va nafas mashqlari kursi (oylik 12 dars)",
        "category": "group_classes",
        "price": 460000,
        "description": "Tinchlanish, stressni yengish va tanani mustahkamlash mashg‘ulotlari.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-13",
        "title": "Krossfit va yuqori intensivlikdagi intervalli mashg‘ulotlar (HIIT)",
        "category": "group_classes",
        "price": 490000,
        "description": "Chidamlilik, quvvat va kaloriyalarni tez yo‘qotish bo‘yicha jadal guruh darsi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-14",
        "title": "Boks va kikkboksing bo‘yicha mashg‘ulotlar (oylik)",
        "category": "combat",
        "price": 500000,
        "description": "Himoyalanish texnikasi, tezkorlik va jismoniy quvvatni rivojlantirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-15",
        "title": "InBody tana tarkibini kompyuterda aniq tahlil qilish",
        "category": "diagnostics",
        "price": 120000,
        "description": "Mushak, yog‘, suv massasi va metabolizm tezligini ko‘rsatuvchi tahliliy hisobot.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-16",
        "title": "Individual sport ovqatlanish ratsionini tuzish (Dietolog maslahati)",
        "category": "nutrition",
        "price": 250000,
        "description": "Kaloriya hisoblangan oylik taomnomalar menyusi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-17",
        "title": "Sport tiklanish massaji (Umumiy tana, 60 daqiqa)",
        "category": "massage",
        "price": 250000,
        "description": "Mashg‘ulotdan so‘ng mushaklardagi kislotani haydash va dam oldirish.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-18",
        "title": "Shvetsiya relaks massaji (60 daqiqa)",
        "category": "massage",
        "price": 220000,
        "description": "Umumiy charchoqni chiqaruvchi xushbo‘y efir moyli yoqimli massaj.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-19",
        "title": "Fin saunasi va turk xamomi (Bir martalik kirish)",
        "category": "spa",
        "price": 90000,
        "description": "Issiq bug‘, toshli sauna va relaks zonasi.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-20",
        "title": "Shaxsiy yechinish shkafi (1 oylik doimiy shaxsiy ijara)",
        "category": "amenities",
        "price": 150000,
        "description": "O‘z buyumlari va sport kiyimlarini xavfsiz qoldirish uchun maxsus qulflanuvchi shkaf.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      },
      {
        "id": "fh-21",
        "title": "Fitnes-bardagi oylik Protein va BCAA smuzi to‘plami (20 ta)",
        "category": "fitness_bar",
        "price": 450000,
        "description": "Mashg‘ulotdan so‘ng oqsilli shirin kokteyllar bilan quvvatni tiklash.",
        "parametersSchema": {
          "type": "object",
          "required": [
            "member_full_name",
            "phone",
            "preferred_branch",
            "start_date",
            "primary_goal"
          ],
          "properties": {
            "member_full_name": {
              "type": "string",
              "title": "A’zo bo‘luvchi F.I.O"
            },
            "phone": {
              "type": "string",
              "title": "Telefon raqami"
            },
            "birth_date": {
              "type": "string",
              "title": "Tug‘ilgan sana (YYYY-MM-DD)"
            },
            "gender": {
              "type": "string",
              "enum": [
                "Erkak",
                "Ayol"
              ],
              "title": "Jinsi"
            },
            "preferred_branch": {
              "type": "string",
              "enum": [
                "Nukus filiali",
                "Navoiy filiali"
              ],
              "title": "Qaysi filial qulay"
            },
            "start_date": {
              "type": "string",
              "title": "A’zolik boshlanish sanasi"
            },
            "primary_goal": {
              "type": "string",
              "enum": [
                "Vazn tashlash (Ozish)",
                "Mushak chiqarish",
                "Suzishni o‘rganish",
                "Salomatlik va tonus"
              ],
              "title": "Asosiy maqsad"
            },
            "has_health_issues": {
              "type": "boolean",
              "title": "Umurtqa yoki yurak bo‘yicha shifokor cheklovlari bormi"
            }
          }
        }
      }
    ]
  }
];

// Also include EVOS for backward compatibility with old tests
const EVOS_LEGACY = {
  slug: 'evos',
  name: 'EVOS Fast Food',
  type: 'DELIVERY',
  category: 'food_dining',
  description: 'Toshkent bo‘ylab mazali lavash, shaurma va fast-food yetkazib berish xizmati.',
  rating: 4.8,
  phone: '+998712000555',
  hours: '09:00 - 02:00',
  baseUrl: 'https://evos-sandbox.shopla.uz',
  locations: [
    { id: 'evos-loc-chilonzor', name: 'EVOS Chilonzor filiali', address: 'Toshkent sh., Chilonzor tumani', lat: 41.2851, lng: 69.2034, radius: 10 }
  ],
  offerings: [
    { id: 'evos_set_x', title: 'X Set (Lavash + Fri + Kola)', category: 'combos', price: 48000, description: 'To‘yimli qarsildoq lavash, fri va muzdek kola.' },
    { id: 'evos_lavash_classic', title: 'Klassik Mol go‘shtli Lavash', category: 'wraps', price: 32000, description: 'Original retsept asosida mol go‘shti va sabzavotlar.' }
  ]
};

const ALL_PROVIDERS = [...PROVIDERS_25, EVOS_LEGACY];

const actionStore = new Map();
const quoteStore = new Map();

function resolveProvider(req, parsedUrl, body, pathSlug) {
  // 0. Path prefix /p/:slug
  if (pathSlug) {
    const found = ALL_PROVIDERS.find(c => c.slug === pathSlug);
    if (found) return found;
  }

  // 1. Explicit Header First
  const explicitSlug = req.headers['x-provider-slug'];
  if (explicitSlug) {
    const cleanSlug = String(explicitSlug).toLowerCase().trim();
    const found = ALL_PROVIDERS.find(c => c.slug === cleanSlug);
    if (found) return found;
  }

  // 2. API key header: {slug}_secret_live_2026
  const apiKey = req.headers['x-provider-api-key'] || req.headers['authorization'] || '';
  const keyMatch = String(apiKey).match(/^([a-z0-9-]+)_secret/i);
  if (keyMatch) {
    const found = ALL_PROVIDERS.find(c => c.slug === keyMatch[1]);
    if (found) return found;
  }

  // 3. Query param or body
  const slug = parsedUrl.query.providerSlug || parsedUrl.query.provider || (body && body.providerSlug);
  if (slug) {
    const cleanSlug = String(slug).toLowerCase().trim();
    const found = ALL_PROVIDERS.find(c => c.slug === cleanSlug);
    if (found) return found;
  }

  // 3. Inspect items offeringId
  const items = (body && body.items) || [];
  if (Array.isArray(items) && items.length > 0) {
    const firstId = items[0].offeringId || items[0].id || '';
    for (const p of ALL_PROVIDERS) {
      if (p.offerings.some(o => o.id === firstId)) {
        return p;
      }
    }
  }

  // Default to maxway
  return ALL_PROVIDERS.find(c => c.slug === 'maxway') || ALL_PROVIDERS[0];
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-provider-api-key, x-provider-slug, idempotency-key'
  });
  res.end(json);
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-provider-api-key, x-provider-slug, idempotency-key'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '/';
  let pathSlug = null;
  const pathMatch = pathname.match(/^\/p\/([a-z0-9-]+)(\/.*)?$/i);
  if (pathMatch) {
    pathSlug = pathMatch[1].toLowerCase();
    pathname = pathMatch[2] || '/';
  }

  let bodyBuffer = '';
  req.on('data', chunk => { bodyBuffer += chunk; });
  req.on('end', () => {
    let body = null;
    if (bodyBuffer) {
      try { body = JSON.parse(bodyBuffer); } catch {}
    }

    const p = resolveProvider(req, parsedUrl, body, pathSlug);

    // 1. Health check
    if (pathname === '/health') {
      return sendJson(res, 200, {
        status: 'HEALTHY',
        latencyMs: 15,
        message: 'Zayuno Ecosystem Provider Live & Verified',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Provider info
    if (pathname === '/provider-info') {
      return sendJson(res, 200, {
        id: p.slug,
        slug: p.slug,
        name: p.name,
        description: p.description,
        status: 'ACTIVE',
        type: p.type,
        category: p.category,
        geography: ['UZ', 'Tashkent'],
        adapterType: 'remote-http',
        authMethod: 'API_KEY',
        capabilities: [
          'METADATA', 'HEALTH', 'LOCATIONS', 'CATALOG', 'SEARCH',
          'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'ACTION_CANCEL',
          'PAYMENT_OPTIONS', 'WEBHOOK'
        ],
        baseUrl: p.baseUrl,
        supportContact: p.phone,
        isCertified: true,
        isPublished: true,
        metadata: {
          environment: 'PRODUCTION',
          tier: 'STANDARD',
          rating: p.rating,
          hours: p.hours
        }
      });
    }

    // 3. Locations
    if (pathname === '/locations') {
      const locations = p.locations.map(loc => ({
        id: loc.id,
        providerId: p.slug,
        providerLocationId: loc.id,
        name: loc.name,
        address: loc.address,
        coordinates: { latitude: loc.lat, longitude: loc.lng },
        operatingHours: { open: '08:00', close: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: loc.radius,
        isActive: true,
        metadata: {}
      }));
      return sendJson(res, 200, locations);
    }

    // 4. Catalog
    if (pathname === '/catalog') {
      const categorySlug = parsedUrl.query.category;
      let filteredOfferings = p.offerings;
      if (categorySlug) {
        filteredOfferings = filteredOfferings.filter(o => o.category === categorySlug);
      }

      const categoriesMap = new Map();
      p.offerings.forEach(o => {
        if (!categoriesMap.has(o.category)) {
          categoriesMap.set(o.category, {
            id: 'cat_' + o.category,
            slug: o.category,
            title: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
            displayOrder: categoriesMap.size + 1
          });
        }
      });

      return sendJson(res, 200, {
        providerSlug: p.slug,
        locationId: parsedUrl.query.locationId || p.locations[0]?.id,
        categories: Array.from(categoriesMap.values()),
        offerings: filteredOfferings.map(o => ({
          id: o.id,
          providerId: p.slug,
          offeringCode: o.id.toUpperCase(),
          title: o.title,
          description: o.description,
          categorySlug: o.category,
          categoryTitle: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
          basePrice: o.price,
          currency: 'UZS',
          isAvailable: true,
          variants: [],
          optionGroups: [],
          tags: [p.category, o.category],
          parametersSchema: o.parametersSchema || null,
          metadata: {}
        })),
        version: '1.0.0',
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Single Offering
    if (pathname.startsWith('/offerings/')) {
      const offeringId = pathname.slice('/offerings/'.length);
      const o = p.offerings.find(item => item.id === offeringId);
      if (!o) {
        return sendJson(res, 404, { message: 'Offering "' + offeringId + '" not found in provider "' + p.slug + '".' });
      }
      return sendJson(res, 200, {
        id: o.id,
        providerId: p.slug,
        offeringCode: o.id.toUpperCase(),
        title: o.title,
        description: o.description,
        categorySlug: o.category,
        categoryTitle: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
        basePrice: o.price,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups: [],
        tags: [p.category, o.category],
        parametersSchema: o.parametersSchema || null,
        metadata: {}
      });
    }

    // 6. Search
    if (pathname === '/search') {
      const query = String(parsedUrl.query.q || parsedUrl.query.query || '').toLowerCase();
      const results = p.offerings
        .filter(o => o.title.toLowerCase().includes(query) || o.description.toLowerCase().includes(query))
        .map(o => ({
          id: o.id,
          providerId: p.slug,
          offeringCode: o.id.toUpperCase(),
          title: o.title,
          description: o.description,
          categorySlug: o.category,
          categoryTitle: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
          basePrice: o.price,
          currency: 'UZS',
          isAvailable: true,
          variants: [],
          optionGroups: [],
          tags: [p.category, o.category],
          parametersSchema: o.parametersSchema || null,
          metadata: {}
        }));
      return sendJson(res, 200, results);
    }

    // 7. Availability
    if (pathname === '/availability') {
      return sendJson(res, 200, {
        isAvailable: true,
        offeringId: (body && body.offeringId) || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // 8. Quote
    if (pathname === '/quote') {
      const items = (body && body.items) || [];
      if (items.length === 0) {
        return sendJson(res, 400, { message: 'At least one item is required.' });
      }

      let subtotal = 0;
      const lines = items.map(item => {
        const o = p.offerings.find(cand => cand.id === item.offeringId) || {
          id: item.offeringId,
          title: item.offeringId,
          price: 45000
        };
        const qty = item.quantity || 1;
        const lineTotal = o.price * qty;
        subtotal += lineTotal;
        return {
          offeringId: o.id,
          offeringTitle: o.title,
          variantId: item.variantId || null,
          variantTitle: null,
          unitPrice: o.price,
          quantity: qty,
          optionsTotal: 0,
          lineTotal,
          selectedOptions: item.selectedOptions || []
        };
      });

      const feeAmount = p.type === 'DELIVERY' ? 15000 : 0;
      const total = subtotal + feeAmount;
      const quoteId = 'zy_quote_' + Date.now() + '_' + Math.random().toString(36).substring(7);

      const quote = {
        id: quoteId,
        providerSlug: p.slug,
        locationId: (body && body.locationId) || p.locations[0]?.id,
        lines,
        subtotal,
        fees: feeAmount > 0 ? [{ name: 'Yetkazib berish xizmati', amount: feeAmount }] : [],
        totalFees: feeAmount,
        discounts: [],
        totalDiscount: 0,
        total,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        parameters: (body && body.parameters) || {}
      };

      quoteStore.set(quoteId, quote);
      return sendJson(res, 200, quote);
    }

    // 9. Actions
    if (pathname === '/actions' && req.method === 'POST') {
      const quoteId = body && body.quoteId;
      const cachedQuote = quoteId ? quoteStore.get(quoteId) : null;

      let subtotal = cachedQuote ? cachedQuote.subtotal : 0;
      let lines = cachedQuote ? cachedQuote.lines : [];

      if (lines.length === 0) {
        const items = (body && body.items) || [];
        lines = items.map(item => {
          const o = p.offerings.find(cand => cand.id === item.offeringId) || {
            id: item.offeringId,
            title: item.offeringId,
            price: 45000
          };
          const qty = item.quantity || 1;
          const lineTotal = o.price * qty;
          subtotal += lineTotal;
          return {
            offeringId: o.id,
            offeringTitle: o.title,
            variantId: null,
            variantTitle: null,
            unitPrice: o.price,
            quantity: qty,
            optionsTotal: 0,
            lineTotal,
            selectedOptions: []
          };
        });
      }

      const feeAmount = p.type === 'DELIVERY' ? 15000 : 0;
      const total = subtotal + feeAmount;
      const actionId = 'zy_act_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const publicId = 'ZY-ACT-' + Math.floor(100000 + Math.random() * 900000);

      const action = {
        id: actionId,
        publicId,
        providerSlug: p.slug,
        providerName: p.name,
        externalActionId: 'ext_' + Date.now(),
        quoteId: quoteId || null,
        locationId: (body && body.locationId) || p.locations[0]?.id,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        nextAction: {
          type: 'OPEN_URL',
          url: 'https://my.click.uz/services/pay?service_id=12345&transaction_param=' + actionId,
          label: 'To‘lov qilish',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        },
        paymentUrl: 'https://my.click.uz/services/pay?service_id=12345&transaction_param=' + actionId,
        lines,
        subtotal,
        fees: feeAmount,
        discount: 0,
        total,
        customer: {
          name: (body && body.customer && body.customer.name) || 'Hurmatli Mijoz',
          phone: (body && body.customer && body.customer.phone) || '+998901234567',
          email: (body && body.customer && body.customer.email) || undefined
        },
        parameters: (body && body.parameters) || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        events: [
          {
            id: 'evt_' + Date.now(),
            status: 'CONFIRMED',
            description: 'Buyurtma qabul qilindi va ijroga yo‘naltirildi.',
            source: 'AI_AGENT',
            createdAt: new Date().toISOString()
          }
        ]
      };

      actionStore.set(actionId, action);
      actionStore.set(publicId, action);
      return sendJson(res, 200, action);
    }

    // 10. Payment Options (supports both /payment-options and /actions/:id/payment-options)
    if (pathname === '/payment-options' || pathname.endsWith('/payment-options')) {
      const actId = pathname.replace('/payment-options', '').replace('/actions/', '') || 'act_default';
      return sendJson(res, 200, [
        {
          id: 'pay_click',
          name: 'Click orqali to‘lov',
          type: 'CLICK',
          isOnline: true,
          checkoutUrl: 'https://my.click.uz/services/pay?service_id=12345&transaction_param=' + actId,
          supportedCurrencies: ['UZS']
        },
        {
          id: 'pay_payme',
          name: 'Payme orqali to‘lov',
          type: 'PAYME',
          isOnline: true,
          checkoutUrl: 'https://checkout.payme.uz/' + actId,
          supportedCurrencies: ['UZS']
        },
        {
          id: 'pay_cash',
          name: 'Qabul qilganda naqd to‘lov',
          type: 'CASH_ON_DELIVERY',
          isOnline: false,
          supportedCurrencies: ['UZS']
        }
      ]);
    }

    // 11. Payment Processing Simulator
    if (pathname.includes('/pay') && req.method === 'POST') {
      const actId = pathname.replace('/pay', '').replace('/actions/', '');
      const action = actionStore.get(actId);
      if (action) {
        action.paymentStatus = 'PAID';
        action.status = 'CONFIRMED';
        action.updatedAt = new Date().toISOString();
        action.events.push({
          id: 'evt_' + Date.now(),
          status: 'CONFIRMED',
          description: 'To‘lov muvaffaqiyatli qabul qilindi.',
          source: 'PROVIDER_WEBHOOK',
          createdAt: new Date().toISOString()
        });
      }
      return sendJson(res, 200, {
        success: true,
        actionId: actId,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        message: 'To‘lov muvaffaqiyatli amalga oshirildi.'
      });
    }

    // 12. Action Status & Cancel
    if (pathname.startsWith('/actions/')) {
      const actionId = pathname.slice('/actions/'.length).replace('/cancel', '');
      if (pathname.endsWith('/cancel')) {
        const action = actionStore.get(actionId);
        if (action) {
          action.status = 'CANCELLED';
          action.updatedAt = new Date().toISOString();
        }
        return sendJson(res, 200, {
          actionId,
          newStatus: 'CANCELLED',
          message: 'Buyurtma muvaffaqiyatli bekor qilindi.'
        });
      }

      const action = actionStore.get(actionId);
      if (action) {
        return sendJson(res, 200, action);
      }
      return sendJson(res, 200, {
        id: actionId,
        publicId: actionId,
        providerSlug: p.slug,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        total: 100000,
        currency: 'UZS',
        lines: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Default 404
    sendJson(res, 404, { message: 'Not found: ' + pathname });
  });
});

const port = process.env.PORT || 4101;
server.listen(port, () => {
  console.log('🚀 Zayuno 25 Universal Ecosystem Server listening on port ' + port);
});

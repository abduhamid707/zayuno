# Zayuno FastAPI Provider Starter

Ushbu shablon Zayuno Provider Contract v1 standarti asosida Python FastAPI va Pydantic yordamida yaratilgan.

## Ishga tushirish

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Lokal integratsiya testini o‘tkazish:
```bash
zy test --local --port 8000 --api-key dev-secret --readonly
```

## Serialization va `None` (null) qiymatlar bo‘yicha tavsiyalar

1. **`response_model_exclude_none=True`**:
   - Python Pydantic modellarida `Optional[T] = None` maydonlari standart holatda JSON ichida `null` bo‘lib chiqishi mumkin.
   - Zayuno protokoli optional maydonlardagi `null` qiymatlarini avtomatik ravishda `undefined` ga normalizatsiya qiladi.
   - Biroq toza va optimal tarmoq uzatishi uchun FastAPI endpointlarida `response_model_exclude_none=True` yoki Pydantic v2 da `model.model_dump(exclude_none=True)` dan foydalanish qat'iy tavsiya etiladi.

2. **Majburiy maydonlar**:
   - Majburiy maydonlar (`id`, `providerId`, `offeringCode`, `title`, `basePrice`, `currency`, `status`, `providerSlug` va boshqalar) hech qachon `None` yoki `null` bo‘lishi mumkin emas.

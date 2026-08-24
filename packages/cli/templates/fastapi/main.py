import os
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

def auth(x_provider_api_key: str | None):
    expected = os.getenv("PROVIDER_API_KEY")
    if expected and x_provider_api_key != expected:
        raise HTTPException(401, "Invalid provider API key.")

sample_offering = {
    'id': 'service-1',
    'providerId': 'my-provider',
    'offeringCode': 'service-1',
    'title': 'Example service',
    'categorySlug': 'services',
    'basePrice': 10000,
    'currency': 'UZS',
    'isAvailable': True
}

@app.get('/health')
def health():
    return {'status': 'HEALTHY', 'latencyMs': 1, 'timestamp': datetime.now(timezone.utc).isoformat()}

@app.get('/provider-info')
def info(x_provider_api_key: str | None = Header(None)):
    auth(x_provider_api_key)
    return {
        'id': 'my-provider',
        'slug': 'my-provider',
        'name': 'My Provider',
        'status': 'DRAFT',
        'type': 'SERVICES',
        'category': 'services',
        'geography': ['UZ'],
        'adapterType': 'remote-http',
        'authMethod': 'API_KEY',
        'capabilities': ['METADATA', 'HEALTH', 'CATALOG']
    }

@app.get('/catalog')
def catalog(x_provider_api_key: str | None = Header(None)):
    auth(x_provider_api_key)
    return {
        'providerSlug': 'my-provider',
        'categories': [{'id': 'services', 'slug': 'services', 'title': 'Services', 'displayOrder': 0}],
        'offerings': [sample_offering]
    }

@app.get('/offerings/{offering_id}')
def get_offering(offering_id: str, x_provider_api_key: str | None = Header(None)):
    auth(x_provider_api_key)
    if offering_id == 'service-1':
        return sample_offering
    raise HTTPException(404, "Offering not found.")

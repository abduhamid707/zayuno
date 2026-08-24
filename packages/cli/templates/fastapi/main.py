import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Zayuno Provider Integration (FastAPI)")

def auth(x_provider_api_key: Optional[str]):
    expected = os.getenv("PROVIDER_API_KEY")
    if expected and x_provider_api_key != expected:
        raise HTTPException(401, "Invalid provider API key.")

class HealthResponse(BaseModel):
    status: str = "HEALTHY"
    latencyMs: int = 1
    timestamp: str
    message: Optional[str] = None

class ProviderInfoResponse(BaseModel):
    id: str
    slug: str
    name: str
    status: str = "DRAFT"
    type: str = "SERVICES"
    category: str = "services"
    geography: List[str] = Field(default_factory=lambda: ["UZ"])
    adapterType: str = "remote-http"
    authMethod: str = "API_KEY"
    capabilities: List[str]
    description: Optional[str] = None
    logoUrl: Optional[str] = None
    baseUrl: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class OfferingModel(BaseModel):
    id: str
    providerId: str
    offeringCode: str
    title: str
    description: Optional[str] = None
    categorySlug: Optional[str] = None
    categoryTitle: Optional[str] = None
    imageUrl: Optional[str] = None
    basePrice: int
    currency: str = "UZS"
    isAvailable: bool = True
    variants: List[Dict[str, Any]] = Field(default_factory=list)
    optionGroups: List[Dict[str, Any]] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    parametersSchema: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CategoryModel(BaseModel):
    id: str
    slug: str
    title: str
    description: Optional[str] = None
    displayOrder: int = 0

class CatalogResponse(BaseModel):
    providerSlug: str
    locationId: Optional[str] = None
    categories: List[CategoryModel]
    offerings: List[OfferingModel]
    parametersSchema: Optional[Dict[str, Any]] = None
    version: Optional[str] = None
    updatedAt: Optional[str] = None

sample_offering = OfferingModel(
    id='service-1',
    providerId='my-provider',
    offeringCode='service-1',
    title='Example service',
    categorySlug='services',
    basePrice=10000,
    currency='UZS',
    isAvailable=True
)

@app.get('/health', response_model=HealthResponse, response_model_exclude_none=True)
def health():
    return HealthResponse(timestamp=datetime.now(timezone.utc).isoformat())

@app.get('/provider-info', response_model=ProviderInfoResponse, response_model_exclude_none=True)
def info(x_provider_api_key: Optional[str] = Header(None)):
    auth(x_provider_api_key)
    return ProviderInfoResponse(
        id='my-provider',
        slug='my-provider',
        name='My Provider',
        capabilities=['METADATA', 'HEALTH', 'CATALOG']
    )

@app.get('/catalog', response_model=CatalogResponse, response_model_exclude_none=True)
def catalog(x_provider_api_key: Optional[str] = Header(None)):
    auth(x_provider_api_key)
    return CatalogResponse(
        providerSlug='my-provider',
        categories=[CategoryModel(id='services', slug='services', title='Services', displayOrder=0)],
        offerings=[sample_offering]
    )

@app.get('/offerings/{offering_id}', response_model=OfferingModel, response_model_exclude_none=True)
def get_offering(offering_id: str, x_provider_api_key: Optional[str] = Header(None)):
    auth(x_provider_api_key)
    if offering_id == 'service-1':
        return sample_offering
    raise HTTPException(404, "Offering not found.")

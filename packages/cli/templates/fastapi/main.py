import os
from datetime import datetime, timezone
from fastapi import FastAPI, Header, HTTPException
app = FastAPI()
def auth(x_provider_api_key: str | None):
    if x_provider_api_key != os.getenv("PROVIDER_API_KEY"): raise HTTPException(401, "Invalid provider API key.")
@app.get('/health')
def health(): return {'status':'HEALTHY','latencyMs':1,'timestamp':datetime.now(timezone.utc).isoformat()}
@app.get('/provider-info')
def info(x_provider_api_key: str | None = Header(None)):
    auth(x_provider_api_key); return {'id':'my-provider','slug':'my-provider','name':'My Provider','status':'DRAFT','type':'SERVICES','category':'services','geography':['UZ'],'adapterType':'remote-http','authMethod':'API_KEY','capabilities':['METADATA','HEALTH','CATALOG']}
@app.get('/catalog')
def catalog(x_provider_api_key: str | None = Header(None)):
    auth(x_provider_api_key); return {'providerSlug':'my-provider','categories':[{'id':'services','slug':'services','title':'Services','displayOrder':0}],'offerings':[{'id':'service-1','providerId':'my-provider','offeringCode':'service-1','title':'Example service','categorySlug':'services','basePrice':10000,'currency':'UZS','isAvailable':True}]}

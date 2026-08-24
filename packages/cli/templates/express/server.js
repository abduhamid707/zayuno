import express from 'express';
const app = express(); app.use(express.json());
const auth = (req, res, next) => req.header('x-provider-api-key') === process.env.PROVIDER_API_KEY ? next() : res.status(401).json({ message: 'Invalid provider API key.' });
app.get('/health', (_req, res) => res.json({ status: 'HEALTHY', latencyMs: 1, timestamp: new Date().toISOString() }));
app.get('/provider-info', auth, (_req, res) => res.json({ id:'my-provider', slug:'my-provider', name:'My Provider', status:'DRAFT', type:'SERVICES', category:'services', geography:['UZ'], adapterType:'remote-http', authMethod:'API_KEY', capabilities:['METADATA','HEALTH','CATALOG'] }));
app.get('/catalog', auth, (_req, res) => res.json({ providerSlug:'my-provider', categories:[{id:'services',slug:'services',title:'Services',displayOrder:0}], offerings:[{id:'service-1',providerId:'my-provider',offeringCode:'service-1',title:'Example service',categorySlug:'services',basePrice:10000,currency:'UZS',isAvailable:true}] }));
app.listen(Number(process.env.PORT || 3000), () => console.log(`Provider listening on ${process.env.PORT || 3000}`));

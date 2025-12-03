export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const productCatalog: CatalogProduct[] = [
  // Network & Internet Services
  { id: "net-1", name: "Internet Subscription (1 Month)", price: 5000, category: "Internet" },
  { id: "net-2", name: "Internet Subscription (3 Months)", price: 13500, category: "Internet" },
  { id: "net-3", name: "Internet Subscription (6 Months)", price: 25000, category: "Internet" },
  { id: "net-4", name: "Internet Subscription (1 Year)", price: 45000, category: "Internet" },
  { id: "net-5", name: "Router Setup", price: 3000, category: "Internet" },
  { id: "net-6", name: "Network Cable (per meter)", price: 200, category: "Internet" },
  
  // Hardware
  { id: "hw-1", name: "WiFi Router (Standard)", price: 15000, category: "Hardware" },
  { id: "hw-2", name: "WiFi Router (Premium)", price: 35000, category: "Hardware" },
  { id: "hw-3", name: "Network Switch 8-Port", price: 8000, category: "Hardware" },
  { id: "hw-4", name: "RJ45 Connector (pack of 10)", price: 500, category: "Hardware" },
  { id: "hw-5", name: "LAN Cable 5m", price: 1500, category: "Hardware" },
  { id: "hw-6", name: "LAN Cable 10m", price: 2500, category: "Hardware" },
  
  // Services
  { id: "srv-1", name: "Technical Support (Hourly)", price: 2000, category: "Services" },
  { id: "srv-2", name: "Installation Service", price: 5000, category: "Services" },
  { id: "srv-3", name: "Maintenance Visit", price: 3500, category: "Services" },
  { id: "srv-4", name: "Network Troubleshooting", price: 4000, category: "Services" },
  
  // Other
  { id: "oth-1", name: "Custom Product", price: 0, category: "Other" },
];

export const getProductById = (id: string): CatalogProduct | undefined => {
  return productCatalog.find(p => p.id === id);
};

export const getProductsByCategory = (category: string): CatalogProduct[] => {
  return productCatalog.filter(p => p.category === category);
};

export const categories = [...new Set(productCatalog.map(p => p.category))];

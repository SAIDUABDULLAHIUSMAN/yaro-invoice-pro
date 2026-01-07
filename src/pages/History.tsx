import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { POSReceipt } from '@/components/POSReceipt';
import { Invoice, Product } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Printer, Trash2, Loader2, Search, X, Filter } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { printReceipt } from '@/utils/printReceipt';

interface DBInvoice {
  id: string;
  invoice_number: string;
  company_name: string;
  company_address: string | null;
  company_phone: string | null;
  customer_name: string;
  issuer_name: string;
  subtotal: number;
  tax: number;
  total: number;
  products: Product[];
  created_at: string;
}

const History = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<DBInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load invoices');
    } else {
      const mapped = (data || []).map(d => ({
        ...d,
        products: d.products as unknown as Product[]
      })) as DBInvoice[];
      setInvoices(mapped);
    }
    setLoading(false);
  };

  // Filtered and sorted invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv => 
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.customer_name.toLowerCase().includes(query) ||
        inv.issuer_name.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateFrom || dateTo) {
      result = result.filter(inv => {
        const invoiceDate = parseISO(inv.created_at);
        const from = dateFrom ? startOfDay(parseISO(dateFrom)) : null;
        const to = dateTo ? endOfDay(parseISO(dateTo)) : null;

        if (from && to) {
          return isWithinInterval(invoiceDate, { start: from, end: to });
        } else if (from) {
          return invoiceDate >= from;
        } else if (to) {
          return invoiceDate <= to;
        }
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'total-desc':
          return Number(b.total) - Number(a.total);
        case 'total-asc':
          return Number(a.total) - Number(b.total);
        default:
          return 0;
      }
    });

    return result;
  }, [invoices, searchQuery, dateFrom, dateTo, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setSortBy('date-desc');
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || sortBy !== 'date-desc';

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete invoice');
    } else {
      toast.success('Invoice deleted');
      setInvoices(invoices.filter(inv => inv.id !== id));
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    }
  };

  const handleViewInvoice = (dbInvoice: DBInvoice) => {
    const invoice: Invoice = {
      id: dbInvoice.invoice_number,
      companyName: dbInvoice.company_name,
      companyAddress: dbInvoice.company_address || undefined,
      companyPhone: dbInvoice.company_phone || undefined,
      customerName: dbInvoice.customer_name,
      issuerName: dbInvoice.issuer_name,
      products: dbInvoice.products,
      date: new Date(dbInvoice.created_at),
      subtotal: Number(dbInvoice.subtotal),
      tax: Number(dbInvoice.tax),
      total: Number(dbInvoice.total),
    };
    setSelectedInvoice(invoice);
  };

  const handlePrint = () => {
    if (!receiptRef.current || !selectedInvoice) return;
    const success = printReceipt(receiptRef.current.innerHTML, selectedInvoice.id);
    if (!success) {
      toast.error("Unable to print. Please allow popups for this site.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoice History</h1>
        <p className="text-muted-foreground">
          {filteredInvoices.length} of {invoices.length} invoices
        </p>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice #, customer, or issuer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="sort-by">Sort By</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger id="sort-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="total-desc">Highest Total</SelectItem>
                    <SelectItem value="total-asc">Lowest Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your search'}
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((inv) => (
              <Card
                key={inv.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedInvoice?.id === inv.invoice_number ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleViewInvoice(inv)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{inv.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₦{Number(inv.total).toFixed(2)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-1"
                      onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selectedInvoice && (
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Receipt Preview</h2>
                <Button onClick={handlePrint} size="sm" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
                <POSReceipt ref={receiptRef} invoice={selectedInvoice} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

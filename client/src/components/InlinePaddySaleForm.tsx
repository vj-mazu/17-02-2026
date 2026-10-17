import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from '../utils/toast';

const Container = styled.div`
  background: #f0fdf4;
  border: 2px solid #10b981;
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  margin: 1rem 0 1.5rem 0;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);
  transition: all 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #a7f3d0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #065f46;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CloseButton = styled.button`
  background: #e5e7eb;
  border: none;
  color: #4b5563;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #d1d5db;
    color: #111827;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const FormGroup = styled.div<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  grid-column: ${props => props.$span ? `span ${props.$span}` : 'auto'};

  @media (max-width: 768px) {
    grid-column: auto;
  }
`;

const Label = styled.label`
  font-weight: 600;
  color: #1f2937;
  font-size: 0.82rem;
`;

const Input = styled.input`
  padding: 0.55rem 0.75rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
  }
`;

const Select = styled.select`
  padding: 0.55rem 0.75rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
  }
`;

const StockBadgeContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px dashed #10b981;
  border-radius: 8px;
  margin-bottom: 1rem;
  align-items: center;
`;

const StockBadge = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: 1rem;
  border-right: 1px solid #e5e7eb;

  &:last-child {
    border-right: none;
    padding-right: 0;
  }

  .badge-label {
    font-size: 0.7rem;
    color: #6b7280;
    text-transform: uppercase;
    font-weight: 600;
  }

  .badge-value {
    font-size: 0.95rem;
    color: #047857;
    font-weight: 700;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #a7f3d0;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.55rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${props => props.$variant === 'secondary' ? `
    background: #e5e7eb;
    color: #4b5563;
    &:hover { background: #d1d5db; }
  ` : `
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35);
    }
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `}
`;

interface InlinePaddySaleFormProps {
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Kunchinittu {
  id: number;
  name: string;
  code: string;
  variety?: { name: string };
  warehouse?: { id: number; name: string; code: string };
}

export const InlinePaddySaleForm: React.FC<InlinePaddySaleFormProps> = ({
  defaultDate,
  onClose,
  onSuccess
}) => {
  const [kunchinittus, setKunchinittus] = useState<Kunchinittu[]>([]);
  const [selectedKunch, setSelectedKunch] = useState<Kunchinittu | null>(null);
  const [stockInfo, setStockInfo] = useState<{ bags: number; netWeight: number } | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [averageRate, setAverageRate] = useState<number>(0);

  // Form Fields
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [soldTo, setSoldTo] = useState('');
  const [bags, setBags] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [lorryNumber, setLorryNumber] = useState('');
  const [wbNo, setWbNo] = useState('');
  const [billNo, setBillNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Fetch Kunchinittus list on mount
  useEffect(() => {
    axios.get('/ledger/kunchinittus')
      .then(res => {
        const data = res.data as any;
        const kList = Array.isArray(data)
          ? data
          : (data && Array.isArray(data.kunchinittus) ? data.kunchinittus : []);
        setKunchinittus(kList.filter((k: any) => !k.isClosed));
      })
      .catch(err => {
        console.error('Error fetching kunchinittus:', err);
        toast.error('Failed to load Godowns list');
      });
  }, []);

  // Fetch Stock Info when Kunchinittu changes
  const handleKunchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const kunchId = e.target.value;
    if (!kunchId) {
      setSelectedKunch(null);
      setStockInfo(null);
      return;
    }

    const found = kunchinittus.find(k => k.id.toString() === kunchId) || null;
    setSelectedKunch(found);

    if (found) {
      setLoadingStock(true);
      try {
        const res = await axios.get(`/ledger/kunchinittu/${found.id}`);
        const remaining = (res.data as any).totals?.remaining || { bags: 0, netWeight: 0 };
        const avg = (res.data as any).kunchinittu?.averageRate || 0;
        setStockInfo(remaining);
        setAverageRate(avg);
      } catch (err) {
        console.error('Error fetching stock:', err);
        toast.error('Failed to load stock details');
        setStockInfo(null);
        setAverageRate(0);
      } finally {
        setLoadingStock(false);
      }
    }
  };

  // Auto-calculate net weight if user hasn't typed a custom one yet
  const handleBagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBags(val);

    const bCount = parseFloat(val) || 0;
    if (stockInfo && stockInfo.bags > 0 && bCount > 0) {
      const avgBagWt = stockInfo.netWeight / stockInfo.bags;
      // Auto-set estimated net weight
      setNetWeight((bCount * avgBagWt).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKunch) {
      toast.error('Please select a Kunchinittu (Godown)');
      return;
    }
    if (!soldTo.trim()) {
      toast.error('Please enter Sold to Party Name');
      return;
    }
    const bagsCount = parseInt(bags) || 0;
    if (bagsCount <= 0) {
      toast.error('Please enter valid bags quantity');
      return;
    }
    const netWt = parseFloat(netWeight) || 0;
    if (netWt <= 0) {
      toast.error('Please enter valid net weight');
      return;
    }

    // Availability validation
    if (stockInfo) {
      if (bagsCount > stockInfo.bags) {
        toast.error(`Insufficient stock! Selected Godown only has ${stockInfo.bags} bags.`);
        return;
      }
      if (netWt > stockInfo.netWeight) {
        toast.error(`Insufficient stock! Selected Godown only has ${stockInfo.netWeight.toLocaleString()} kg net weight.`);
        return;
      }
    }

    setSaving(true);
    try {
      await axios.post('/arrivals', {
        date,
        movementType: 'sale',
        fromKunchinintuId: selectedKunch.id,
        fromWarehouseId: selectedKunch.warehouse?.id,
        variety: selectedKunch.variety?.name,
        bags: bagsCount,
        broker: soldTo.trim(),
        fromLocation: soldTo.trim(),
        grossWeight: 0,
        tareWeight: 0,
        netWeight: netWt,
        lorryNumber: lorryNumber.toUpperCase().trim(),
        wbNo: wbNo.toUpperCase().trim(),
        billNo: billNo.toUpperCase().trim(),
        remarks: remarks.trim()
      });

      toast.success('Paddy Sale recorded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording paddy sale:', err);
      toast.error(err.response?.data?.error || 'Failed to record Paddy Sale');
    } finally {
      setSaving(false);
    }
  };

  const avgBagWeight = stockInfo && stockInfo.bags > 0
    ? (stockInfo.netWeight / stockInfo.bags).toFixed(2)
    : '0';

  return (
    <Container>
      <Header>
        <Title>
          🌾 Record Paddy Sale (Inline Entry)
        </Title>
        <CloseButton type="button" onClick={onClose} title="Close form">
          &times;
        </CloseButton>
      </Header>

      <form onSubmit={handleSubmit}>
        <FormGrid>
          <FormGroup>
            <Label>Sale Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup $span={2}>
            <Label>From Kunchinittu (Godown) *</Label>
            <Select
              value={selectedKunch?.id || ''}
              onChange={handleKunchChange}
              required
            >
              <option value="">-- Select Kunchinittu --</option>
              {kunchinittus.map(k => (
                <option key={k.id} value={k.id}>
                  {k.code} ({k.warehouse?.code || 'No Warehouse'}) - {k.variety?.name || 'No Variety'}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup $span={2}>
            <Label>Sold to Party Name *</Label>
            <Input
              type="text"
              placeholder="Enter Party / Buyer Name"
              value={soldTo}
              onChange={e => setSoldTo(e.target.value)}
              required
            />
          </FormGroup>
        </FormGrid>

        {loadingStock && (
          <div style={{ padding: '0.5rem', color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>
            ⏳ Loading live stock details...
          </div>
        )}

        {selectedKunch && stockInfo && (
          <StockBadgeContainer>
            <StockBadge>
              <span className="badge-label">Variety</span>
              <span className="badge-value">{selectedKunch.variety?.name || '-'}</span>
            </StockBadge>
            <StockBadge>
              <span className="badge-label">Godown / Wh</span>
              <span className="badge-value">{selectedKunch.warehouse?.name} ({selectedKunch.warehouse?.code})</span>
            </StockBadge>
            <StockBadge>
              <span className="badge-label">Available Stock</span>
              <span className="badge-value">{stockInfo.bags.toLocaleString()} bags</span>
            </StockBadge>
            <StockBadge>
              <span className="badge-label">Net Weight</span>
              <span className="badge-value">{stockInfo.netWeight.toLocaleString()} kg</span>
            </StockBadge>
            <StockBadge>
              <span className="badge-label">Avg Bag Weight</span>
              <span className="badge-value">{avgBagWeight} kg</span>
            </StockBadge>
            <StockBadge>
              <span className="badge-label">Avg Rate</span>
              <span className="badge-value">{averageRate > 0 ? `₹${averageRate.toFixed(2)}/Q` : '-'}</span>
            </StockBadge>
          </StockBadgeContainer>
        )}

        <FormGrid>
          <FormGroup>
            <Label>Bags to Sell *</Label>
            <Input
              type="number"
              placeholder="e.g. 100"
              value={bags}
              onChange={handleBagsChange}
              required
              max={stockInfo ? stockInfo.bags : undefined}
            />
          </FormGroup>

          <FormGroup>
            <Label>Net Weight (kg) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 5000.00"
              value={netWeight}
              onChange={e => setNetWeight(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Lorry Number *</Label>
            <Input
              type="text"
              placeholder="e.g. AP 16 TY 1234"
              value={lorryNumber}
              onChange={e => setLorryNumber(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Weigh Bridge (WB) No *</Label>
            <Input
              type="text"
              placeholder="WB Slip No"
              value={wbNo}
              onChange={e => setWbNo(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Bill Number *</Label>
            <Input
              type="text"
              placeholder="Bill No"
              value={billNo}
              onChange={e => setBillNo(e.target.value)}
              required
            />
          </FormGroup>

          <FormGroup $span={3}>
            <Label>Remarks</Label>
            <Input
              type="text"
              placeholder="Any additional notes..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </FormGroup>
        </FormGrid>

        <ButtonRow>
          <ActionButton type="button" $variant="secondary" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton
            type="submit"
            $variant="primary"
            disabled={
              saving ||
              (stockInfo ? (parseInt(bags) > stockInfo.bags || parseFloat(netWeight) > stockInfo.netWeight) : false)
            }
          >
            {saving ? 'Recording Sale...' : '✓ Record Paddy Sale'}
          </ActionButton>
        </ButtonRow>
      </form>
    </Container>
  );
};

export default InlinePaddySaleForm;
